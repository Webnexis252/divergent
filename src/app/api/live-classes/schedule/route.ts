import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiUnauthorized, apiServerError } from "@/lib/api-response";
import { getStudentScheduleData } from "@/lib/live-class-service";

/**
 * GET /api/live-classes/schedule
 * Returns today's and this-week's live classes for the authenticated student,
 * bucketed by day window with per-item status tags.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const data = await getStudentScheduleData(auth.userId);
    return apiSuccess(data);
  } catch (err) {
    console.error("[GET_STUDENT_LIVE_CLASS_SCHEDULE_ERROR]", err);
    return apiServerError();
  }
}
