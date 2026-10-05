import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type Client = Prisma.TransactionClient | typeof prisma;

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
