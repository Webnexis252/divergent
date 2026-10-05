// @vitest-environment node
/**
 * Payment lifecycle against a real Postgres. The guarantees tested here
 * (exactly-once completion, the last coupon use going to one buyer) come from
 * row locks and conditional UPDATEs, which mocks can't reproduce.
 *
 * Opt-in: set TEST_DATABASE_URL to a disposable database whose schema matches
 * prisma/schema.prisma (`prisma migrate deploy` builds one from scratch). NEVER point it at production: every test truncates tables.
 *
 *   TEST_DATABASE_URL="postgresql://postgres@localhost:55432/lms_test?sslmode=disable" \
 *     npm run test:integration   (files run one at a time: they share the database)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertDifferentDatabases, assertWritableDatabase } from '../../../scripts/lib/db-guard.mjs';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)('payments (integration)', () => {
  let prisma: PrismaClient;
  let payments: typeof import('@/lib/payments');
  let coupons: typeof import('@/lib/coupons');
  let COURSE_ENROLLMENT_XP: number;

  beforeAll(async () => {
    // These tests TRUNCATE tables. .env's DATABASE_URL is production, so refuse
    // a TEST_DATABASE_URL that points at the same database, or a remote one
    // that hasn't been confirmed with CONFIRM_DATABASE.
    assertDifferentDatabases(TEST_DATABASE_URL, process.env.DATABASE_URL, 'run destructive integration tests');
    assertWritableDatabase(TEST_DATABASE_URL, 'run destructive integration tests');
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    prisma = (await import('@/lib/prisma')).default as unknown as PrismaClient;
    payments = await import('@/lib/payments');
    coupons = await import('@/lib/coupons');
    ({ COURSE_ENROLLMENT_XP } = await import('@/lib/xp'));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Payment", "Enrollment", "BundleCourse", "Bundle", "Coupon", "Course", "User" CASCADE',
    );
  });

  let seq = 0;
  const unique = () => `${Date.now()}-${++seq}`;

  async function student() {
    return prisma.user.create({ data: { email: `s-${unique()}@test.local`, role: 'STUDENT' } });
  }

  async function course(emiPlans?: unknown) {
    const id = unique();
    return prisma.course.create({
      data: { title: `Course ${id}`, slug: `course-${id}`, ...(emiPlans ? { emiPlans: emiPlans as never } : {}) },
    });
  }

  async function pendingPayment(data: {
    userId: string;
    courseId?: string;
    bundleId?: string;
    couponCode?: string;
    installmentIndex?: number;
  }) {
    return prisma.payment.create({
      data: { amount: 999, status: 'PENDING', razorpayOrderId: `order_${unique()}`, paymentGateway: 'RAZORPAY', ...data },
    });
  }

  it('completes a payment exactly once when confirmations race', async () => {
    const user = await student();
    const { id: courseId } = await course();
    const payment = await pendingPayment({ userId: user.id, courseId });

    // Webhook, redirect, verify call and retries all arriving at once
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => payments.completePayment(payment.id, { razorpayPaymentId: `pay_${i}` })),
    );

    expect(results.filter((r) => r.completed)).toHaveLength(1);
    expect(await prisma.enrollment.count({ where: { userId: user.id, courseId, status: 'ACTIVE' } })).toBe(1);
    const reloaded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(reloaded.xpPoints).toBe(COURSE_ENROLLMENT_XP); // awarded once, not 8 times
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');
  });

  it('ends paid and enrolled whichever of "failed" and "paid" lands first', async () => {
    for (let i = 0; i < 5; i++) {
      const user = await student();
      const { id: courseId } = await course();
      const payment = await pendingPayment({ userId: user.id, courseId });

      await Promise.all([payments.failPayment(payment.id), payments.completePayment(payment.id)]);

      expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');
      expect(await prisma.enrollment.count({ where: { userId: user.id, courseId } })).toBe(1);
    }
  });

  it('never moves a successful payment backwards', async () => {
    const user = await student();
    const { id: courseId } = await course();
    const payment = await pendingPayment({ userId: user.id, courseId });
    await payments.completePayment(payment.id);

    expect(await payments.failPayment(payment.id)).toBe(false);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('SUCCESS');
  });

  it('rolls the status back if enrolling fails, leaving the payment retryable', async () => {
    const user = await student();
    const { id: courseId } = await course([{ amount: 500, dueDays: 30 }, { amount: 500, dueDays: 30 }]);
    // Installment #6 doesn't exist in a 2-installment plan
    const payment = await pendingPayment({ userId: user.id, courseId, installmentIndex: 5 });

    await expect(payments.completePayment(payment.id)).rejects.toThrow(/no installment #6/);

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PENDING');
    expect(await prisma.enrollment.count({ where: { userId: user.id } })).toBe(0);
  });

  it('sets the access window for an installment payment', async () => {
    const user = await student();
    const { id: courseId } = await course([{ amount: 500, dueDays: 30 }, { amount: 500, dueDays: 30 }]);
    const payment = await pendingPayment({ userId: user.id, courseId, installmentIndex: 0 });

    const before = Date.now();
    await payments.completePayment(payment.id);

    const enrollment = await prisma.enrollment.findUniqueOrThrow({
      where: { userId_courseId: { userId: user.id, courseId } },
    });
    expect(enrollment).toMatchObject({ isInstallmentBased: true, currentInstallment: 1 });
    const days = (enrollment.validUntil!.getTime() - before) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);
  });

  it('enrolls in every course of a bundle', async () => {
    const user = await student();
    const courses = await Promise.all([course(), course(), course()]);
    const bundle = await prisma.bundle.create({ data: { title: 'Bundle', slug: `bundle-${unique()}` } });
    await prisma.bundleCourse.createMany({ data: courses.map((c) => ({ bundleId: bundle.id, courseId: c.id })) });
    const payment = await pendingPayment({ userId: user.id, bundleId: bundle.id });

    const result = await payments.completePayment(payment.id);

    expect(result.courseIds.sort()).toEqual(courses.map((c) => c.id).sort());
    expect(await prisma.enrollment.count({ where: { userId: user.id, bundleId: bundle.id } })).toBe(3);
  });

  it('gives the last coupon use to exactly one of many simultaneous buyers', async () => {
    await prisma.coupon.create({ data: { code: 'LAST1', maxUses: 1, usedCount: 0 } });

    const claims = await Promise.all(Array.from({ length: 10 }, () => coupons.reserveCouponUse('LAST1')));

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'LAST1' } })).usedCount).toBe(1);
  });

  it('refuses inactive coupons and never releases below zero', async () => {
    await prisma.coupon.create({ data: { code: 'OFF', maxUses: 10, isActive: false } });
    await prisma.coupon.create({ data: { code: 'ZERO', maxUses: 10, usedCount: 0 } });

    expect(await coupons.reserveCouponUse('OFF')).toBe(false);
    await coupons.releaseCouponUse('ZERO');
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'ZERO' } })).usedCount).toBe(0);
  });

  it('returns the coupon use when a payment fails, and takes it back on a late success', async () => {
    const user = await student();
    const { id: courseId } = await course();
    await prisma.coupon.create({ data: { code: 'SAVE10', maxUses: 5 } });
    expect(await coupons.reserveCouponUse('SAVE10')).toBe(true); // reserved at checkout
    const payment = await pendingPayment({ userId: user.id, courseId, couponCode: 'SAVE10' });

    expect(await payments.failPayment(payment.id)).toBe(true);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'SAVE10' } })).usedCount).toBe(0);

    const { completed } = await payments.completePayment(payment.id); // gateway captured it after all
    expect(completed).toBe(true);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: 'SAVE10' } })).usedCount).toBe(1);
    expect(await prisma.enrollment.count({ where: { userId: user.id, courseId } })).toBe(1);
  });
});
