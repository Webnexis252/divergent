import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';
import { getStudentProgress } from '@/lib/student-progress';

/**
 * GET /api/users/me/progress
 * Returns full progress data for the student:
 * - Course progress with lesson counts
 * - Upcoming and missed live classes
 * - Performance chart (7-day lesson completions)
 * - Weekly goals (derived from actual activity)
 * - Streak and study time
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    return apiSuccess(await getStudentProgress(auth.userId));
  } catch (err) {
    console.error('[GET_MY_PROGRESS_ERROR]', err);
    return apiServerError();
  }
}
