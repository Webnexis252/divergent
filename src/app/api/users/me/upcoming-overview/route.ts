import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiServerError, apiUnauthorized, apiSuccess } from "@/lib/api-response";
import { getUpcomingOverview } from "@/lib/student-dashboard";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["STUDENT"]);
    if (!auth) {
      return apiUnauthorized();
    }

    return apiSuccess(await getUpcomingOverview(auth.userId));
  } catch (error) {
    console.error("[GET_UPCOMING_OVERVIEW_ERROR]", error);
    return apiServerError();
  }
}
