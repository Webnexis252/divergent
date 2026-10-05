import { NextRequest } from 'next/server';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { cronAuthError } from '@/lib/cron-auth';
import { classReminderTemplate, findClassesStartingSoon } from '@/lib/class-reminders';
import { enqueueJob } from '@/lib/jobs';

/**
 * GET /api/cron/class-reminders
 *
 * Queues WhatsApp reminders for live classes starting 5–15 minutes from now.
 * Run it every 5 minutes: a QStash schedule (`*\/5 * * * *`) or a Vercel Pro
 * cron. It isn't in vercel.json because Vercel Hobby only allows daily crons
 * and would reject the deployment. Does nothing until
 * INTERAKT_CLASS_REMINDER_TEMPLATE_NAME is set (see src/lib/class-reminders.ts).
 *
 * Protected by CRON_SECRET, sent as `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const authError = cronAuthError(req);
  if (authError === 'not-configured') return apiServerError('Cron job is not configured securely on the server.');
  if (authError) return apiForbidden('Invalid cron secret');

  try {
    if (!classReminderTemplate()) {
      return apiSuccess({ queued: 0, skipped: 'INTERAKT_CLASS_REMINDER_TEMPLATE_NAME is not set' });
    }
    const classes = await findClassesStartingSoon();
    for (const liveClass of classes) {
      await enqueueJob('class-reminders', { liveClassId: liveClass.id });
    }
    return apiSuccess({ queued: classes.length, ranAt: new Date().toISOString() });
  } catch (err) {
    console.error('[CRON_CLASS_REMINDERS_ERROR]', err);
    return apiServerError();
  }
}

export const POST = GET;
