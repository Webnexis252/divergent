// @vitest-environment node
import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  paymentFindUnique: vi.fn(),
  paymentFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
  enrollmentFindUnique: vi.fn(),
  bundleCourseCount: vi.fn(),
  completePayment: vi.fn(),
  failPayment: vi.fn(),
  fetchCashfreeOutcome: vi.fn(),
  fetchGatewayOutcome: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/prisma', () => ({
  default: {
    payment: { findUnique: mocks.paymentFindUnique, findFirst: mocks.paymentFindFirst, findMany: mocks.paymentFindMany },
    enrollment: { findUnique: mocks.enrollmentFindUnique },
    bundleCourse: { count: mocks.bundleCourseCount },
  },
}));
vi.mock('@/lib/payments', () => ({ completePayment: mocks.completePayment, failPayment: mocks.failPayment }));
vi.mock('@/lib/payment-gateways', () => ({
  fetchCashfreeOutcome: mocks.fetchCashfreeOutcome,
  fetchGatewayOutcome: mocks.fetchGatewayOutcome,
}));
vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));

import { POST as webhook } from '@/app/api/payments/webhook/route';
import { POST as razorpayWebhook } from '@/app/api/payments/razorpay/webhook/route';
import { POST as verifyOrder } from '@/app/api/payments/verify-order/route';
import { GET as callback } from '@/app/api/payments/callback/route';
import { reconcilePayments } from '@/lib/payment-reconciliation';

const SECRET = 'whsec_test';

function signedWebhook(body: object, { secret = SECRET, tamper = false } = {}) {
  const raw = JSON.stringify(body);
  const timestamp = '1700000000';
  const signature = crypto.createHmac('sha256', secret).update(timestamp + raw).digest('base64');
  return new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    body: tamper ? raw.replace('order_1', 'order_2') : raw,
    headers: { 'x-webhook-timestamp': timestamp, 'x-webhook-signature': signature },
  });
}

const successEvent = { type: 'PAYMENT_SUCCESS_WEBHOOK', data: { order: { order_id: 'order_1' }, payment: { cf_payment_id: 42 } } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('CASHFREE_WEBHOOK_SECRET', SECRET);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.completePayment.mockResolvedValue({ completed: true, payment: { userId: 'u1', status: 'SUCCESS' }, courseIds: [] });
  mocks.failPayment.mockResolvedValue(true);
});

describe('Cashfree webhook', () => {
  it('completes the payment for a correctly signed success event', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p1' });

    const res = await webhook(signedWebhook(successEvent));

    expect(res.status).toBe(200);
    expect(mocks.completePayment).toHaveBeenCalledWith('p1', { cashfreePaymentId: '42' });
  });

  it('rejects a bad or tampered signature without touching payments', async () => {
    expect((await webhook(signedWebhook(successEvent, { secret: 'wrong' }))).status).toBe(401);
    expect((await webhook(signedWebhook(successEvent, { tamper: true }))).status).toBe(401);
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('fails closed when no secret is configured', async () => {
    vi.stubEnv('CASHFREE_WEBHOOK_SECRET', '');
    vi.stubEnv('CASHFREE_SECRET_KEY', '');

    expect((await webhook(signedWebhook(successEvent))).status).toBe(500);
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('falls back to the Cashfree secret key when no webhook secret is set', async () => {
    vi.stubEnv('CASHFREE_WEBHOOK_SECRET', '');
    vi.stubEnv('CASHFREE_SECRET_KEY', 'cf_secret');
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p1' });

    expect((await webhook(signedWebhook(successEvent, { secret: 'cf_secret' }))).status).toBe(200);
  });

  it('returns 500 when completion fails so Cashfree retries', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p1' });
    mocks.completePayment.mockRejectedValue(new Error('db down'));

    expect((await webhook(signedWebhook(successEvent))).status).toBe(500);
  });

  it('routes failure events through failPayment (PENDING → FAILED only)', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p1' });

    await webhook(signedWebhook({ type: 'PAYMENT_FAILED_WEBHOOK', data: { order: { order_id: 'order_1' } } }));

    expect(mocks.failPayment).toHaveBeenCalledWith('p1');
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });
});

describe('verify-order', () => {
  const request = (body: object) =>
    new NextRequest('http://localhost/api/payments/verify-order', { method: 'POST', body: JSON.stringify(body) });

  beforeEach(() => {
    mocks.requireAuth.mockResolvedValue({ userId: 'attacker', role: 'STUDENT' });
    mocks.fetchCashfreeOutcome.mockResolvedValue({ state: 'PAID', reference: { cashfreePaymentId: '9' } });
  });

  it('only looks up the order among the caller\'s own payments', async () => {
    mocks.paymentFindFirst.mockResolvedValue(null); // the paid order belongs to someone else

    const res = await verifyOrder(request({ order_id: 'order_victim', courseId: 'expensive' }));

    expect(res.status).toBe(404);
    expect(mocks.paymentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cashfreeOrderId: 'order_victim', userId: 'attacker' } }),
    );
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('refuses to unlock a different course than the order was placed for', async () => {
    mocks.paymentFindFirst.mockResolvedValue({ id: 'p1', courseId: 'cheap', bundleId: null });

    const res = await verifyOrder(request({ order_id: 'order_1', courseId: 'expensive' }));

    expect(res.status).toBe(400);
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('completes the caller\'s own paid order', async () => {
    mocks.paymentFindFirst.mockResolvedValue({ id: 'p1', courseId: 'c1', bundleId: null });
    mocks.enrollmentFindUnique.mockResolvedValue({ id: 'e1' });

    const res = await verifyOrder(request({ order_id: 'order_1', courseId: 'c1' }));

    expect(res.status).toBe(200);
    expect(mocks.completePayment).toHaveBeenCalledWith('p1', { cashfreePaymentId: '9' });
  });

  it('keeps a still-processing payment pending instead of failing it', async () => {
    mocks.paymentFindFirst.mockResolvedValue({ id: 'p1', courseId: 'c1', bundleId: null });
    mocks.fetchCashfreeOutcome.mockResolvedValue({ state: 'IN_PROGRESS' });

    const res = await verifyOrder(request({ order_id: 'order_1' }));

    expect(res.status).toBe(409);
    expect(mocks.failPayment).not.toHaveBeenCalled();
  });
});

describe('Cashfree redirect callback', () => {
  const request = new NextRequest('http://localhost/api/payments/callback?order_id=order_1');

  it('shows "pending" for an in-flight payment and leaves it PENDING', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p1', status: 'PENDING' });
    mocks.fetchCashfreeOutcome.mockResolvedValue({ state: 'IN_PROGRESS' });

    const res = await callback(request);

    expect(res.headers.get('location')).toContain('status=pending');
    expect(mocks.failPayment).not.toHaveBeenCalled();
  });

  it('does not mark anything failed when Cashfree can\'t be reached', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p1', status: 'PENDING' });
    mocks.fetchCashfreeOutcome.mockRejectedValue(new Error('timeout'));

    const res = await callback(request);

    expect(res.headers.get('location')).toContain('status=failed&message=error');
    expect(mocks.failPayment).not.toHaveBeenCalled();
  });
});

describe('reconcilePayments', () => {
  const HOUR = 60 * 60 * 1000;
  const ago = (ms: number) => new Date(Date.now() - ms);

  it('completes paid orders, expires old unpaid ones, and leaves the rest', async () => {
    mocks.paymentFindMany.mockResolvedValue([
      { id: 'paid', status: 'PENDING', createdAt: ago(2 * HOUR), razorpayOrderId: 'o1', cashfreeOrderId: null },
      { id: 'stale', status: 'PENDING', createdAt: ago(30 * HOUR), razorpayOrderId: 'o2', cashfreeOrderId: null },
      { id: 'recent', status: 'PENDING', createdAt: ago(2 * HOUR), razorpayOrderId: 'o3', cashfreeOrderId: null },
      { id: 'upi', status: 'PENDING', createdAt: ago(30 * HOUR), razorpayOrderId: 'o4', cashfreeOrderId: null },
      { id: 'broken', status: 'PENDING', createdAt: ago(30 * HOUR), razorpayOrderId: 'o5', cashfreeOrderId: null },
    ]);
    mocks.fetchGatewayOutcome.mockImplementation(async ({ razorpayOrderId }: { razorpayOrderId: string }) => {
      if (razorpayOrderId === 'o1') return { state: 'PAID', reference: { razorpayPaymentId: 'pay_1' } };
      if (razorpayOrderId === 'o4') return { state: 'IN_PROGRESS' };
      if (razorpayOrderId === 'o5') throw new Error('gateway down');
      return { state: 'UNPAID' };
    });

    const summary = await reconcilePayments();

    expect(mocks.completePayment).toHaveBeenCalledWith('paid', { razorpayPaymentId: 'pay_1' });
    expect(mocks.failPayment).toHaveBeenCalledTimes(1);
    expect(mocks.failPayment).toHaveBeenCalledWith('stale'); // unpaid > 24h; 'recent' is still in its window
    expect(summary).toEqual({ checked: 5, completed: 1, expired: 1, unchanged: 2, errors: 1 });
  });
});

describe('Razorpay webhook', () => {
  const RZP_SECRET = 'rzp_whsec_test';
  const captured = {
    event: 'payment.captured',
    payload: { payment: { entity: { id: 'pay_1', order_id: 'order_rzp_1', status: 'captured' } } },
  };

  function signedRazorpay(body: object, { secret = RZP_SECRET, tamper = false } = {}) {
    const raw = JSON.stringify(body);
    const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    return new NextRequest('http://localhost/api/payments/razorpay/webhook', {
      method: 'POST',
      body: tamper ? raw.replace('order_rzp_1', 'order_rzp_2') : raw,
      headers: { 'x-razorpay-signature': signature },
    });
  }

  beforeEach(() => vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', RZP_SECRET));

  it('completes the order for a correctly signed payment.captured event', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p9' });

    const res = await razorpayWebhook(signedRazorpay(captured));

    expect(res.status).toBe(200);
    expect(mocks.paymentFindUnique).toHaveBeenCalledWith({ where: { razorpayOrderId: 'order_rzp_1' }, select: { id: true } });
    expect(mocks.completePayment).toHaveBeenCalledWith('p9', { razorpayPaymentId: 'pay_1' });
  });

  it('takes the order id from order.paid events', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p9' });
    const orderPaid = {
      event: 'order.paid',
      payload: { order: { entity: { id: 'order_rzp_1' } }, payment: { entity: { id: 'pay_2', order_id: 'order_rzp_1' } } },
    };

    expect((await razorpayWebhook(signedRazorpay(orderPaid))).status).toBe(200);
    expect(mocks.completePayment).toHaveBeenCalledWith('p9', { razorpayPaymentId: 'pay_2' });
  });

  it('rejects a bad or tampered signature without touching payments', async () => {
    expect((await razorpayWebhook(signedRazorpay(captured, { secret: 'wrong' }))).status).toBe(401);
    expect((await razorpayWebhook(signedRazorpay(captured, { tamper: true }))).status).toBe(401);
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('fails closed when no webhook secret is configured', async () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', '');
    expect((await razorpayWebhook(signedRazorpay(captured))).status).toBe(503);
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('ignores payment.failed so the student can retry the same order', async () => {
    const failed = { event: 'payment.failed', payload: { payment: { entity: { id: 'pay_3', order_id: 'order_rzp_1' } } } };
    expect((await razorpayWebhook(signedRazorpay(failed))).status).toBe(200);
    expect(mocks.completePayment).not.toHaveBeenCalled();
    expect(mocks.failPayment).not.toHaveBeenCalled();
  });

  it('acknowledges unknown orders so Razorpay stops retrying', async () => {
    mocks.paymentFindUnique.mockResolvedValue(null);
    expect((await razorpayWebhook(signedRazorpay(captured))).status).toBe(200);
    expect(mocks.completePayment).not.toHaveBeenCalled();
  });

  it('returns 500 when completion fails so Razorpay retries', async () => {
    mocks.paymentFindUnique.mockResolvedValue({ id: 'p9' });
    mocks.completePayment.mockRejectedValue(new Error('db down'));
    expect((await razorpayWebhook(signedRazorpay(captured))).status).toBe(500);
  });
});
