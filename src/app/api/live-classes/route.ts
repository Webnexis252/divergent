import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getStudentLiveClassData } from '@/lib/live-class-service';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * GET /api/live-classes
 * Returns all live classes (from courses the student is enrolled in),
 * bucketed by status: live, upcoming, completed.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const data = await getStudentLiveClassData(auth.userId);
    return apiSuccess(data);
  } catch (err) {
    console.error('[GET_LIVE_CLASSES_ERROR]', err);
    return apiServerError();
  }
}
