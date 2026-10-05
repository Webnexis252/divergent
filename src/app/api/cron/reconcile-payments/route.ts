import { NextRequest } from 'next/server';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { reconcilePayments } from '@/lib/payment-reconciliation';
import { safeEqual } from '@/lib/secure-compare';

/**
 * GET /api/cron/reconcile-payments
 *
 * Asks Cashfree / Razorpay about payments still PENDING after 15 minutes (and
 * recently FAILED ones), enrolls students whose payment went through but was
 * never confirmed to us, and expires unpaid orders after 24 hours.
 *
 * Protected by CRON_SECRET, sent as `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[CRON_RECONCILE_PAYMENTS] CRON_SECRET is missing in environment variables');
      return apiServerError('Cron job is not configured securely on the server.');
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    if (!safeEqual(token, cronSecret)) {
      return apiForbidden('Invalid cron secret');
    }

    const summary = await reconcilePayments();
    console.log('[CRON] Payment reconciliation', JSON.stringify(summary));

    return apiSuccess({ ...summary, ranAt: new Date().toISOString() }, 'Payments reconciled');
  } catch (err) {
    console.error('[CRON_RECONCILE_PAYMENTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/cron/reconcile-payments
 * Same as GET, allows being called as a webhook.
 */
export const POST = GET;
