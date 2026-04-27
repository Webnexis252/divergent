import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiForbidden, apiServerError, apiSuccess } from "@/lib/api-response";
import { getCalendarFeed } from "@/lib/calendar-feed";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const feed = await getCalendarFeed({
      audience: "admin",
      role: auth.role,
      userId: auth.userId,
    });

    return apiSuccess(feed);
  } catch (error) {
    console.error("[ADMIN_CALENDAR_ERROR]", error);
    return apiServerError();
  }
}
