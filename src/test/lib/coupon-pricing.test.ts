import { describe, expect, it } from 'vitest';
import { checkCoupon, couponDiscount, type CouponRules } from '@/lib/coupon-pricing';

const NOW = new Date('2026-10-17T10:00:00Z');

function coupon(overrides: Partial<CouponRules> = {}): CouponRules {
  return {
    code: 'SAVE50',
    isActive: true,
    startDate: null,
    validUntil: null,
    usedCount: 0,
    maxUses: 100,
    discountType: 'PERCENTAGE',
    discountValue: 50,
    maxDiscount: null,
    minPurchase: null,
    limitPerLearner: 1,
    targetUsers: 'ALL',
    applicableCourseIds: [],
    ...overrides,
  };
}

const order = { amount: 4000, targetId: 'course-a', successfulPayments: 0, usesByBuyer: 0, now: NOW };

describe('couponDiscount', () => {
  it('caps a percentage discount at maxDiscount', () => {
    expect(couponDiscount(coupon({ maxDiscount: 500 }), 4000)).toBe(500);
  });

  it('applies the full percentage under the cap', () => {
    expect(couponDiscount(coupon({ maxDiscount: 5000 }), 4000)).toBe(2000);
  });

  it('never discounts more than the price', () => {
    expect(couponDiscount(coupon({ discountType: 'FIXED', discountValue: 999 }), 300)).toBe(300);
  });

  it('rounds percentage discounts to paise', () => {
    expect(couponDiscount(coupon({ discountValue: 33 }), 999.99)).toBe(330);
  });
});

describe('checkCoupon', () => {
  it('returns the discounted price for a valid coupon', () => {
    const result = checkCoupon(coupon({ maxDiscount: 500 }), order);
    expect(result).toMatchObject({ ok: true, code: 'SAVE50', discount: 500, finalAmount: 3500 });
  });

  it('rejects a coupon restricted to other courses', () => {
    const result = checkCoupon(coupon({ applicableCourseIds: ['course-b'] }), order);
    expect(result).toEqual({ ok: false, error: 'This coupon is not valid for the selected course or bundle', status: 400 });
  });

  it('accepts a coupon restricted to this course', () => {
    expect(checkCoupon(coupon({ applicableCourseIds: ['course-a'] }), order).ok).toBe(true);
  });

  it('rejects unknown, inactive, not-yet-started, expired and used-up coupons', () => {
    expect(checkCoupon(null, order)).toMatchObject({ ok: false, status: 404 });
    expect(checkCoupon(coupon({ isActive: false }), order).ok).toBe(false);
    expect(checkCoupon(coupon({ startDate: new Date('2026-11-01') }), order).ok).toBe(false);
    expect(checkCoupon(coupon({ validUntil: new Date('2026-10-01') }), order).ok).toBe(false);
    expect(checkCoupon(coupon({ usedCount: 100 }), order).ok).toBe(false);
  });

  it('rejects coupons on later installments', () => {
    expect(checkCoupon(coupon(), { ...order, installmentIndex: 1 }).ok).toBe(false);
    expect(checkCoupon(coupon(), { ...order, installmentIndex: 0 }).ok).toBe(true);
  });

  it('enforces first-time and renewing buyers', () => {
    expect(checkCoupon(coupon({ targetUsers: 'FIRST_TIME' }), { ...order, successfulPayments: 1 }).ok).toBe(false);
    expect(checkCoupon(coupon({ targetUsers: 'RENEWING' }), { ...order, successfulPayments: 0 }).ok).toBe(false);
    expect(checkCoupon(coupon({ targetUsers: 'RENEWING' }), { ...order, successfulPayments: 2 }).ok).toBe(true);
  });

  it('enforces the per-learner limit and the minimum purchase', () => {
    expect(checkCoupon(coupon({ limitPerLearner: 1 }), { ...order, usesByBuyer: 1 }).ok).toBe(false);
    expect(checkCoupon(coupon({ minPurchase: 5000 }), order).ok).toBe(false);
  });
});
