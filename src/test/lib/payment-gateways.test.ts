// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  pgOrderFetchPayments: vi.fn(),
  breakerFire: vi.fn(),
  razorpayFetchPayments: vi.fn(),
}));

vi.mock('@/lib/cashfree', () => ({
  default: { PGOrderFetchPayments: mocks.pgOrderFetchPayments },
  paymentBreaker: { fire: mocks.breakerFire },
}));
vi.mock('razorpay', () => ({
  default: class {
    orders = { fetchPayments: mocks.razorpayFetchPayments };
  },
}));

import { fetchCashfreeOutcome, fetchRazorpayOutcome } from '@/lib/payment-gateways';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RAZORPAY_KEY_ID', 'rzp_test_x');
  vi.stubEnv('RAZORPAY_KEY_SECRET', 'secret');
  mocks.breakerFire.mockImplementation((fn: () => unknown) => fn());
});

describe('fetchCashfreeOutcome', () => {
  const attempts = (...statuses: string[]) => ({
    data: statuses.map((payment_status, i) => ({ payment_status, cf_payment_id: 100 + i })),
  });

  it('maps a successful attempt to PAID with its payment id', async () => {
    mocks.pgOrderFetchPayments.mockResolvedValue(attempts('FAILED', 'SUCCESS'));
    expect(await fetchCashfreeOutcome('o1')).toEqual({ state: 'PAID', reference: { cashfreePaymentId: '101' } });
  });

  it('treats a pending attempt as in progress, and no attempts as unpaid', async () => {
    mocks.pgOrderFetchPayments.mockResolvedValueOnce(attempts('FAILED', 'PENDING'));
    expect(await fetchCashfreeOutcome('o1')).toEqual({ state: 'IN_PROGRESS' });
    mocks.pgOrderFetchPayments.mockResolvedValueOnce(attempts('USER_DROPPED'));
    expect(await fetchCashfreeOutcome('o1')).toEqual({ state: 'UNPAID' });
  });

  it('treats an unknown order as unpaid but rethrows other errors', async () => {
    mocks.pgOrderFetchPayments.mockRejectedValueOnce({ response: { status: 404 } });
    expect(await fetchCashfreeOutcome('o1')).toEqual({ state: 'UNPAID' });
    mocks.pgOrderFetchPayments.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    await expect(fetchCashfreeOutcome('o1')).rejects.toThrow('ETIMEDOUT');
  });

  it('throws rather than guessing when Cashfree returns no data', async () => {
    mocks.pgOrderFetchPayments.mockResolvedValue({});
    await expect(fetchCashfreeOutcome('o1')).rejects.toThrow(/no payment data/);
  });

  it('uses the circuit breaker by default and skips it when asked', async () => {
    mocks.pgOrderFetchPayments.mockResolvedValue(attempts('SUCCESS'));

    await fetchCashfreeOutcome('o1');
    expect(mocks.breakerFire).toHaveBeenCalledTimes(1);

    await fetchCashfreeOutcome('o1', { useBreaker: false });
    expect(mocks.breakerFire).toHaveBeenCalledTimes(1);
  });
});

describe('fetchRazorpayOutcome', () => {
  it('maps captured to PAID, authorized to IN_PROGRESS, and failed to UNPAID', async () => {
    mocks.razorpayFetchPayments.mockResolvedValueOnce({ items: [{ id: 'pay_f', status: 'failed' }, { id: 'pay_c', status: 'captured' }] });
    expect(await fetchRazorpayOutcome('o1')).toEqual({ state: 'PAID', reference: { razorpayPaymentId: 'pay_c' } });

    mocks.razorpayFetchPayments.mockResolvedValueOnce({ items: [{ id: 'pay_a', status: 'authorized' }] });
    expect(await fetchRazorpayOutcome('o1')).toEqual({ state: 'IN_PROGRESS' });

    mocks.razorpayFetchPayments.mockResolvedValueOnce({ items: [{ id: 'pay_f', status: 'failed' }] });
    expect(await fetchRazorpayOutcome('o1')).toEqual({ state: 'UNPAID' });
  });

  it('treats an order unknown to these keys as unpaid but rethrows other errors', async () => {
    // Shape observed from the real API for orders.fetchPayments on a missing order
    mocks.razorpayFetchPayments.mockRejectedValueOnce({ statusCode: 404 });
    expect(await fetchRazorpayOutcome('o1')).toEqual({ state: 'UNPAID' });

    mocks.razorpayFetchPayments.mockRejectedValueOnce({ statusCode: 500, error: { description: 'Server error' } });
    await expect(fetchRazorpayOutcome('o1')).rejects.toMatchObject({ statusCode: 500 });
  });
});
