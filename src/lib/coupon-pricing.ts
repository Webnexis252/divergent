/**
 * Coupon rules, in one place. The coupon preview (/api/coupons/validate) and
 * both checkouts (Cashfree and Razorpay create-order) each had their own copy,
 * and the copies drifted: one checkout ignored the percentage cap, neither
 * checked which courses a coupon is for, and the preview skipped start dates
 * and first-time / renewing rules. Pure, so the rules are unit tested.
 */

export type CouponRules = {
  code: string;
  isActive: boolean;
  startDate: Date | null;
  validUntil: Date | null;
  usedCount: number;
  maxUses: number;
  discountType: string; // "PERCENTAGE" | "FIXED"
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number | null;
  limitPerLearner: number;
  targetUsers: string; // "ALL" | "FIRST_TIME" | "RENEWING"
  applicableCourseIds: string[];
};

export type CouponOrder = {
  /** Price before the discount. */
  amount: number;
  /** The course or bundle being bought. */
  targetId: string;
  installmentIndex?: number | null;
  /** The buyer's successful payments, for FIRST_TIME / RENEWING coupons. */
  successfulPayments: number;
  /** The buyer's successful payments that used this coupon. */
  usesByBuyer: number;
  now?: Date;
};

export type CouponCheck =
  | { ok: true; code: string; discountType: string; discountValue: number; discount: number; finalAmount: number }
  | { ok: false; error: string; status: number };

const roundRupees = (value: number) => Math.round(value * 100) / 100;

/** The discount on `amount`: a percentage capped at `maxDiscount`, or a fixed sum, never more than the price. */
export function couponDiscount(
  coupon: Pick<CouponRules, 'discountType' | 'discountValue' | 'maxDiscount'>,
  amount: number,
): number {
  let discount =
    coupon.discountType === 'PERCENTAGE' ? roundRupees((amount * coupon.discountValue) / 100) : Number(coupon.discountValue);
  if (coupon.discountType === 'PERCENTAGE' && coupon.maxDiscount != null && discount > coupon.maxDiscount) {
    discount = Number(coupon.maxDiscount);
  }
  return Math.min(Math.max(0, discount), amount);
}

export function checkCoupon(coupon: CouponRules | null, order: CouponOrder): CouponCheck {
  const now = order.now ?? new Date();
  const fail = (error: string, status = 400): CouponCheck => ({ ok: false, error, status });

  if (!coupon) return fail('Invalid coupon code', 404);
  if (!coupon.isActive) return fail('This coupon is no longer active');
  if (coupon.startDate && coupon.startDate > now) return fail("This coupon isn't active yet");
  if (coupon.validUntil && coupon.validUntil < now) return fail('This coupon has expired');
  if (coupon.usedCount >= coupon.maxUses) return fail('This coupon has reached its usage limit');
  if (typeof order.installmentIndex === 'number' && order.installmentIndex > 0) {
    return fail('Coupons cannot be applied to subsequent installments');
  }
  if (coupon.applicableCourseIds.length > 0 && !coupon.applicableCourseIds.includes(order.targetId)) {
    return fail('This coupon is not valid for the selected course or bundle');
  }
  if (coupon.minPurchase && order.amount < coupon.minPurchase) {
    return fail(`Minimum purchase amount for this coupon is ${coupon.minPurchase}`);
  }
  if (coupon.targetUsers === 'FIRST_TIME' && order.successfulPayments > 0) {
    return fail('This coupon is only valid for first-time purchasers.');
  }
  if (coupon.targetUsers === 'RENEWING' && order.successfulPayments === 0) {
    return fail('This coupon is only valid for renewing users (users with prior purchases).');
  }
  if (coupon.limitPerLearner && order.usesByBuyer >= coupon.limitPerLearner) {
    return fail(`You have already reached the usage limit for this coupon (${coupon.limitPerLearner})`);
  }

  const discount = couponDiscount(coupon, order.amount);
  return {
    ok: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discount,
    finalAmount: roundRupees(Math.max(0, order.amount - discount)),
  };
}
