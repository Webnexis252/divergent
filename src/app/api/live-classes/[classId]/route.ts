import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { getStudentClassroomData } from "@/lib/live-class-service";

type Params = { params: Promise<{ classId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { classId } = await params;
    const data = await getStudentClassroomData({
      classId,
      userId: auth.userId,
      role: auth.role,
    });

    if (data === null) return apiNotFound("Live class");
    if (data === "forbidden") {
      return apiForbidden("You do not have access to this classroom");
    }

    return apiSuccess(data);
  } catch (error) {
    console.error("[GET_STUDENT_LIVE_CLASS_ERROR]", error);
    return apiServerError();
  }
}
