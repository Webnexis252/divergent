import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiServerError, apiSuccess, apiUnauthorized } from "@/lib/api-response";
import { getCalendarFeed } from "@/lib/calendar-feed";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["STUDENT"]);
    if (!auth) return apiUnauthorized();

    const feed = await getCalendarFeed({
      audience: "student",
      role: auth.role,
      userId: auth.userId,
    });

    return apiSuccess(feed);
  } catch (error) {
    console.error("[STUDENT_CALENDAR_ERROR]", error);
    return apiServerError();
  }
}
