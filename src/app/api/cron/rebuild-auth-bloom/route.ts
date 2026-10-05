import { NextRequest } from 'next/server';
import { apiSuccess, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { AuthBloomRebuildInProgressError, rebuildAuthBloomFilters } from '@/lib/auth-bloom';
import { safeEqual } from '@/lib/secure-compare';

/**
 * GET /api/cron/rebuild-auth-bloom
 *
 * Rebuilds the email / phone Bloom filters used by signup from the User table.
 * Run it once after deploying (the Redis filter is unused until then), then on
 * a schedule — nightly is plenty — so deleted users and replaced phone numbers
 * drop out of the filter.
 *
 * Protected by CRON_SECRET, sent as `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[CRON_REBUILD_AUTH_BLOOM] CRON_SECRET is missing in environment variables');
      return apiServerError('Cron job is not configured securely on the server.');
    }

    const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
    if (!safeEqual(token, cronSecret)) {
      return apiForbidden('Invalid cron secret');
    }

    const result = await rebuildAuthBloomFilters();

    console.log(
      `[CRON] Rebuilt auth Bloom filters: ${result.emails} emails, ${result.phones} phones in ${result.durationMs}ms`,
    );

    return apiSuccess(
      { ...result, ranAt: new Date().toISOString() },
      'Auth Bloom filters rebuilt',
    );
  } catch (err) {
    if (err instanceof AuthBloomRebuildInProgressError) {
      return apiError(err.message, 409);
    }
    console.error('[CRON_REBUILD_AUTH_BLOOM_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/cron/rebuild-auth-bloom
 * Same as GET, allows being called as a webhook.
 */
export const POST = GET;
