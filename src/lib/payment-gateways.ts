import Razorpay from 'razorpay';
import cashfree, { paymentBreaker } from '@/lib/cashfree';
import type { GatewayReference } from '@/lib/payments';

/**
 * What the gateway itself says about an order, used by the Cashfree redirect,
 * Cashfree verify and the reconciliation cron. The gateway is the source of
 * truth for whether money was taken; our Payment row follows it.
 *
 *  • PAID — money captured: complete the payment.
 *  • IN_PROGRESS — an attempt is still processing (e.g. a pending UPI
 *    payment): leave the payment PENDING, don't mark it failed.
 *  • UNPAID — no successful or in-flight attempt.
 */
export type GatewayOutcome =
  | { state: 'PAID'; reference: GatewayReference }
  | { state: 'IN_PROGRESS' }
  | { state: 'UNPAID' };

export type GatewayLookupOptions = {
  /**
   * Go through the circuit breaker that guards live checkout (default). The
   * reconciliation job turns this off so a batch of lookups for odd orders
   * can't trip the breaker and block real buyers.
   */
  useBreaker?: boolean;
};

export async function fetchCashfreeOutcome(
  orderId: string,
  { useBreaker = true }: GatewayLookupOptions = {},
): Promise<GatewayOutcome> {
  const fetchPayments = () => cashfree.PGOrderFetchPayments(orderId);
  let response;
  try {
    response = useBreaker ? await paymentBreaker.fire(fetchPayments) : await fetchPayments();
  } catch (err) {
    // The order doesn't exist at Cashfree (e.g. created in the other
    // environment), so it can never be paid
    if ((err as { response?: { status?: number } })?.response?.status === 404) return { state: 'UNPAID' };
    throw err;
  }
  if (!response?.data) {
    // No answer is not the same as "unpaid": let the caller retry later.
    throw new Error(`Cashfree returned no payment data for order ${orderId}`);
  }

  const success = response.data.find((p) => p.payment_status === 'SUCCESS');
  if (success) {
    return { state: 'PAID', reference: { cashfreePaymentId: String(success.cf_payment_id ?? '') || null } };
  }
  if (response.data.some((p) => p.payment_status === 'PENDING')) return { state: 'IN_PROGRESS' };
  return { state: 'UNPAID' };
}

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  }
  razorpay ??= new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  return razorpay;
}

export async function fetchRazorpayOutcome(orderId: string): Promise<GatewayOutcome> {
  let items;
  try {
    ({ items } = await getRazorpay().orders.fetchPayments(orderId));
  } catch (err) {
    // The order doesn't exist for these keys (e.g. a test-mode order looked up
    // with live keys), so it can never be paid
    // (404 for orders.fetchPayments; some Razorpay endpoints say 400 "does not exist").
    const { statusCode, error } = (err ?? {}) as { statusCode?: number; error?: { description?: string } };
    if (statusCode === 404 || (statusCode === 400 && /does not exist/i.test(error?.description ?? ''))) {
      return { state: 'UNPAID' };
    }
    throw err;
  }

  const captured = items.find((p) => p.status === 'captured');
  if (captured) return { state: 'PAID', reference: { razorpayPaymentId: captured.id } };
  // Authorized but not yet captured: the money is held, not taken. Don't
  // fulfil and don't fail; the next check sees it captured (or released).
  if (items.some((p) => p.status === 'authorized' || p.status === 'created')) {
    return { state: 'IN_PROGRESS' };
  }
  return { state: 'UNPAID' };
}

/** The outcome for a stored payment, or null if it has no gateway order to ask about. */
export async function fetchGatewayOutcome(
  payment: { cashfreeOrderId: string | null; razorpayOrderId: string | null },
  options: GatewayLookupOptions = {},
): Promise<GatewayOutcome | null> {
  if (payment.razorpayOrderId) return fetchRazorpayOutcome(payment.razorpayOrderId);
  if (payment.cashfreeOrderId) return fetchCashfreeOutcome(payment.cashfreeOrderId, options);
  return null;
}
