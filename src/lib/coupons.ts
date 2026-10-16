import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { checkCoupon, type CouponCheck } from '@/lib/coupon-pricing';

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * Looks up a coupon code and checks it against this buyer and order with the
 * shared rules in coupon-pricing.ts. Used by the coupon preview and by both
 * checkouts, so what the student is shown is what they're charged.
 */
export async function evaluateCoupon(
  code: string,
  order: { userId: string; amount: number; targetId: string; installmentIndex?: number | null },
): Promise<CouponCheck> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) return checkCoupon(null, { ...order, successfulPayments: 0, usesByBuyer: 0 });

  const [successfulPayments, usesByBuyer] = await Promise.all([
    prisma.payment.count({ where: { userId: order.userId, status: 'SUCCESS' } }),
    prisma.payment.count({ where: { userId: order.userId, couponCode: coupon.code, status: 'SUCCESS' } }),
  ]);
  return checkCoupon(coupon, { ...order, successfulPayments, usesByBuyer });
}

/**
 * Claims one use of a coupon in a single conditional UPDATE, so two buyers
 * can't both take the last use: the database checks `usedCount < maxUses` and
 * increments in the same statement. Called when the order is created; a
 * payment that later fails gives the use back with `releaseCouponUse`.
 *
 * @returns false when the coupon is used up, inactive, or unknown.
 */
export async function reserveCouponUse(code: string, client: Client = prisma): Promise<boolean> {
  const updated = await client.$executeRaw`
    UPDATE "Coupon"
    SET "usedCount" = "usedCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = ${code} AND "isActive" = true AND "usedCount" < "maxUses"
  `;
  return updated === 1;
}

/** Returns a reserved use, e.g. when the order fails or couldn't be created. */
export async function releaseCouponUse(code: string, client: Client = prisma): Promise<void> {
  await client.$executeRaw`
    UPDATE "Coupon"
    SET "usedCount" = "usedCount" - 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = ${code} AND "usedCount" > 0
  `;
}

/**
 * Takes a use back for a payment that succeeded after its order was marked
 * FAILED (which released the reservation). No limit check: the buyer has
 * already paid the discounted price, so the use must be honoured.
 */
export async function reclaimCouponUse(code: string, client: Client = prisma): Promise<void> {
  await client.$executeRaw`
    UPDATE "Coupon"
    SET "usedCount" = "usedCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "code" = ${code}
  `;
}
