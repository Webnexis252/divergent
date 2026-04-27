import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiForbidden, apiServerError, apiSuccess } from "@/lib/api-response";
import { getCalendarFeed } from "@/lib/calendar-feed";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["MENTOR"]);
    if (!auth) return apiForbidden("Only teachers can access this calendar");

    const feed = await getCalendarFeed({
      audience: "teacher",
      role: auth.role,
      userId: auth.userId,
    });

    return apiSuccess(feed);
  } catch (error) {
    console.error("[TEACHER_CALENDAR_ERROR]", error);
    return apiServerError();
  }
}
