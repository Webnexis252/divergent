import { NextRequest } from 'next/server';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { cronAuthError } from '@/lib/cron-auth';
import { enqueueJob } from '@/lib/jobs';
import { reportWeekEnding, weeklyReportsEnabled } from '@/lib/weekly-reports';

/**
 * GET /api/cron/weekly-reports
 *
 * Starts the weekly progress email run (scheduled in vercel.json for Sunday
 * 13:30 UTC, 7 pm IST). Does nothing unless WEEKLY_REPORTS_ENABLED=true; see
 * src/lib/weekly-reports.ts before enabling it.
 *
 * Protected by CRON_SECRET, sent as `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const authError = cronAuthError(req);
  if (authError === 'not-configured') return apiServerError('Cron job is not configured securely on the server.');
  if (authError) return apiForbidden('Invalid cron secret');

  try {
    if (!weeklyReportsEnabled()) {
      return apiSuccess({ started: false, skipped: 'WEEKLY_REPORTS_ENABLED is not true' });
    }
    const weekEnding = reportWeekEnding();
    await enqueueJob('weekly-reports', { weekEnding });
    return apiSuccess({ started: true, weekEnding });
  } catch (err) {
    console.error('[CRON_WEEKLY_REPORTS_ERROR]', err);
    return apiServerError();
  }
}

export const POST = GET;
