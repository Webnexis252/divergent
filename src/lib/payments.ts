import type { Payment, PaymentStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { ensureActiveEnrollmentWithXpTx, type InstallmentOptions } from '@/lib/xp';
import { reclaimCouponUse, releaseCouponUse } from '@/lib/coupons';

/**
 * Payment lifecycle. Every route that learns a payment's outcome (Cashfree
 * webhook, Cashfree redirect callback, Cashfree verify, Razorpay verify and the
 * reconciliation cron) goes through these functions, so a payment is
 * fulfilled exactly once however many of them report it, and in any order.
 */

/**
 * Allowed transitions, as target ← sources. Nothing moves backwards
 * (SUCCESS never returns to PENDING or FAILED). FAILED → SUCCESS is allowed
 * because a gateway can still capture money for an order we marked failed —
 * a retry inside the same checkout, or a premature "failed" from the redirect
 * page — and a captured payment must be honoured.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: [],
  SUCCESS: ['PENDING', 'FAILED'],
  FAILED: ['PENDING'],
  REFUNDED: ['SUCCESS'],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[to].includes(from);
}

export type GatewayReference = {
  cashfreePaymentId?: string | null;
  razorpayPaymentId?: string | null;
};

export type CompletionResult = {
  /** True only for the single call that moved the payment to SUCCESS and enrolled. */
  completed: boolean;
  payment: Payment;
  /** Courses this payment grants (all bundle courses, or the one course). */
  courseIds: string[];
  /** The enrollment, for single-course payments completed by this call. */
  enrollment?: Awaited<ReturnType<typeof ensureActiveEnrollmentWithXpTx>>['enrollment'];
};

/**
 * Marks a payment SUCCESS and enrolls the student, in one transaction.
 *
 * Exactly once: each UPDATE only matches while the payment is still in the
 * expected status, and Postgres serialises concurrent UPDATEs on the row, so
 * one caller wins and every other caller (a retried webhook, the redirect and
 * the verify call racing it) gets count 0 and returns `completed: false`.
 *
 * All or nothing: enrollment runs in the same transaction, so if it throws the
 * status change rolls back too. The payment stays PENDING / FAILED and is
 * retried by the next webhook delivery or the reconciliation cron, instead of
 * being left paid but never enrolled.
 */
export async function completePayment(
  paymentId: string,
  reference: GatewayReference = {},
): Promise<CompletionResult> {
  return prisma.$transaction(
    async (tx) => {
      const referenceData = {
        ...(reference.cashfreePaymentId ? { cashfreePaymentId: reference.cashfreePaymentId } : {}),
        ...(reference.razorpayPaymentId ? { razorpayPaymentId: reference.razorpayPaymentId } : {}),
      };

      let previous: PaymentStatus | null = null;
      for (const from of PAYMENT_TRANSITIONS.SUCCESS) {
        const { count } = await tx.payment.updateMany({
          where: { id: paymentId, status: from },
          data: { status: 'SUCCESS', ...referenceData },
        });
        if (count === 1) {
          previous = from;
          break;
        }
      }

      const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
      if (!previous) return { completed: false, payment, courseIds: [] };

      // Marking it FAILED gave the coupon use back; this late success takes it again.
      if (previous === 'FAILED' && payment.couponCode) {
        await reclaimCouponUse(payment.couponCode, tx);
      }

      return { completed: true, payment, ...(await fulfilPayment(tx, payment)) };
    },
    { timeout: 20_000 },
  );
}

/**
 * PENDING → FAILED, giving back the coupon use reserved at checkout.
 * Returns false when the payment had already moved on (e.g. to SUCCESS).
 */
export async function failPayment(paymentId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, status: { in: [...PAYMENT_TRANSITIONS.FAILED] } },
      data: { status: 'FAILED' },
    });
    if (count === 0) return false;

    const { couponCode } = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      select: { couponCode: true },
    });
    if (couponCode) await releaseCouponUse(couponCode, tx);
    return true;
  });
}

// ─── Fulfilment ───────────────────────────────────────────────────────────────

async function fulfilPayment(
  tx: Prisma.TransactionClient,
  payment: Payment,
): Promise<Pick<CompletionResult, 'courseIds' | 'enrollment'>> {
  if (payment.bundleId) {
    const bundleCourses = await tx.bundleCourse.findMany({
      where: { bundleId: payment.bundleId },
      select: { courseId: true },
    });
    for (const { courseId } of bundleCourses) {
      await ensureActiveEnrollmentWithXpTx(tx, payment.userId, courseId, 'ACTIVE', true, payment.bundleId);
    }
    return { courseIds: bundleCourses.map((bc) => bc.courseId) };
  }

  if (payment.courseId) {
    const installmentOptions = await installmentOptionsFor(tx, payment);
    const { enrollment } = await ensureActiveEnrollmentWithXpTx(
      tx,
      payment.userId,
      payment.courseId,
      'ACTIVE',
      true,
      undefined,
      installmentOptions,
    );
    return { courseIds: [payment.courseId], enrollment };
  }

  return { courseIds: [] };
}

type EmiInstallment = { amount?: number | string; dueDays?: number | string };
type EmiPlan = { id?: string; installments: EmiInstallment[] };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Access window for an installment payment. Supports both stored formats of
 * `Course.emiPlans`: a list of plans with `installments`, and the legacy flat
 * list of installments (treated as one plan). The plan comes from
 * `payment.notes.planId` when the checkout recorded one.
 */
async function installmentOptionsFor(
  tx: Prisma.TransactionClient,
  payment: Payment,
): Promise<InstallmentOptions | undefined> {
  if (payment.installmentIndex === null || payment.installmentIndex === undefined || !payment.courseId) {
    return undefined;
  }

  const course = await tx.course.findUnique({
    where: { id: payment.courseId },
    select: { emiPlans: true },
  });
  const rawPlans = course?.emiPlans as unknown as Array<EmiPlan | EmiInstallment> | null;
  if (!rawPlans || rawPlans.length === 0) return undefined;

  const plans: EmiPlan[] =
    'installments' in rawPlans[0]
      ? (rawPlans as EmiPlan[])
      : [{ id: 'legacy', installments: rawPlans as EmiInstallment[] }];

  let planId = 'legacy';
  try {
    const notes = payment.notes ? JSON.parse(payment.notes) : null;
    if (notes?.planId) planId = notes.planId;
  } catch {
    // Notes aren't JSON for older payments: use the first plan.
  }
  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  const index = payment.installmentIndex;
  const installment = plan.installments[index];
  if (!installment) {
    // Leaves the payment unfulfilled (the transaction rolls back) rather than
    // granting full access for a partial payment; needs an admin to look.
    throw new Error(`Payment ${payment.id}: course has no installment #${index + 1} in plan ${plan.id ?? 'legacy'}`);
  }

  let validUntil: Date | null = null;
  if (index !== plan.installments.length - 1) {
    const existing = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } },
      select: { validUntil: true },
    });
    const base = existing?.validUntil ? new Date(existing.validUntil) : new Date();
    validUntil = new Date(base.getTime() + Number(installment.dueDays) * DAY_MS);
  }

  return { isInstallmentBased: true, currentInstallment: index + 1, validUntil };
}
