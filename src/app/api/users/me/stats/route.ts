import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';
import { getStudentDashboardStats } from '@/lib/student-dashboard';

/**
 * GET /api/users/me/stats
 * Returns the authenticated student's dashboard stats:
 * enrollmentCount, streakCount, xpPoints, and enrolled courses with progress.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const stats = await getStudentDashboardStats(auth.userId);
    if (!stats) return apiUnauthorized();

    return apiSuccess(stats);
  } catch (err) {
    console.error('[GET_ME_STATS_ERROR]', err);
    return apiServerError();
  }
}
