import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/cron/cleanup-doubts
 *
 * Deletes DoubtTicket records that have been RESOLVED for more than 24 hours.
 * Should be called by a Vercel Cron job or any scheduler.
 *
 * Protected by CRON_SECRET environment variable.
 * If CRON_SECRET is not set, falls back to checking the Authorization header
 * for a Bearer token.
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret securely
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[CRON_CLEANUP_DOUBTS] CRON_SECRET is missing in environment variables');
      return apiServerError('Cron job is not configured securely on the server.');
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (token !== cronSecret) {
      return apiForbidden('Invalid cron secret');
    }

    // Calculate the cutoff: 24 hours ago
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Delete resolved doubts older than 24hrs
    const result = await prisma.doubtTicket.deleteMany({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        updatedAt: { lte: cutoff },
      },
    });

    console.log(`[CRON] Deleted ${result.count} resolved/closed doubts older than 24hrs`);

    return apiSuccess(
      {
        deleted: result.count,
        cutoffTime: cutoff.toISOString(),
        ranAt: new Date().toISOString(),
      },
      `Cleaned up ${result.count} resolved doubts`
    );
  } catch (err) {
    console.error('[CRON_CLEANUP_DOUBTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/cron/cleanup-doubts
 * Same as GET, allows being called as a webhook.
 */
export const POST = GET;
