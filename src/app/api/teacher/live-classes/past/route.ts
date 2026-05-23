import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
import { requireAuth } from "@/lib/auth";
import { apiForbidden, apiServerError, apiSuccess } from "@/lib/api-response";
import { getTeacherPastClasses } from "@/lib/live-class-service";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!auth) {
      return apiForbidden("Only teachers can access class control");
    }

    const data = await getTeacherPastClasses({
      userId: auth.userId,
      role: auth.role,
    });
    console.log("[DEBUG] getTeacherPastClasses returned", data.length, "classes for user", auth.userId, "role", auth.role);

    return apiSuccess(data);
  } catch (error) {
    console.error("[GET_TEACHER_PAST_CLASSES_ERROR]", error);
    return apiServerError();
  }
}
