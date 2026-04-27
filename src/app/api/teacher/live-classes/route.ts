import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { apiForbidden, apiServerError, apiSuccess } from "@/lib/api-response";
import { getTeacherScheduleData } from "@/lib/live-class-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!auth) {
      return apiForbidden("Only teachers can access class control");
    }

    const data = await getTeacherScheduleData({
      userId: auth.userId,
      role: auth.role,
    });

    return apiSuccess(data);
  } catch (error) {
    console.error("[GET_TEACHER_LIVE_CLASSES_ERROR]", error);
    return apiServerError();
  }
}
