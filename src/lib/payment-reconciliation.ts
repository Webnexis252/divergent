import prisma from '@/lib/prisma';
import { completePayment, failPayment } from '@/lib/payments';
import { fetchGatewayOutcome } from '@/lib/payment-gateways';

// Give the buyer time to finish checkout before asking the gateway.
const PENDING_GRACE_MS = 15 * 60 * 1000;
// Unpaid for this long: mark FAILED, which also frees a reserved coupon use.
const EXPIRE_UNPAID_AFTER_MS = 24 * 60 * 60 * 1000;
// Re-check recently failed orders: a retry in the same checkout, or a late
// capture after the redirect page called it failed, still means money taken.
const RECHECK_FAILED_FOR_MS = 48 * 60 * 60 * 1000;

export interface ReconcileSummary {
  checked: number;
  /** Paid at the gateway but not here (missed webhook, closed tab): now enrolled. */
  completed: number;
  /** Unpaid past the expiry window: marked FAILED. */
  expired: number;
  /** Still in progress or within the window: left as they are. */
  unchanged: number;
  errors: number;
}

/**
 * Safety net for payments whose outcome never reached us: asks the gateway
 * about PENDING orders older than the grace period and recently FAILED ones,
 * completes the ones that were paid and expires the ones that never will be.
 * Every action goes through completePayment / failPayment, so it is safe to
 * run while webhooks and redirects are being processed.
 */
export async function reconcilePayments(limit = 50): Promise<ReconcileSummary> {
  const now = Date.now();
  const candidates = await prisma.payment.findMany({
    where: {
      OR: [
        { status: 'PENDING', createdAt: { lt: new Date(now - PENDING_GRACE_MS) } },
        { status: 'FAILED', createdAt: { gte: new Date(now - RECHECK_FAILED_FOR_MS) } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, status: true, createdAt: true, cashfreeOrderId: true, razorpayOrderId: true },
  });

  const summary: ReconcileSummary = { checked: 0, completed: 0, expired: 0, unchanged: 0, errors: 0 };

  for (const payment of candidates) {
    summary.checked++;
    try {
      // Bypass the live-checkout circuit breaker: see GatewayLookupOptions
      const outcome = await fetchGatewayOutcome(payment, { useBreaker: false });
      if (outcome?.state === 'PAID') {
        const { completed } = await completePayment(payment.id, outcome.reference);
        summary[completed ? 'completed' : 'unchanged']++;
      } else if (
        outcome?.state === 'UNPAID' &&
        payment.status === 'PENDING' &&
        now - payment.createdAt.getTime() >= EXPIRE_UNPAID_AFTER_MS
      ) {
        summary[(await failPayment(payment.id)) ? 'expired' : 'unchanged']++;
      } else {
        summary.unchanged++;
      }
    } catch (err) {
      summary.errors++;
      console.error('[PAYMENT_RECONCILE_ERROR]', { paymentId: payment.id, err });
    }
  }

  return summary;
}
