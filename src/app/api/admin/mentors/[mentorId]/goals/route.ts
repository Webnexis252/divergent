import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiForbidden, apiServerError, apiError } from "@/lib/api-response";

/** Extract mentorId from URL path: /api/admin/mentors/{mentorId}/goals */
function getMentorId(req: NextRequest): string | null {
  const segments = new URL(req.url).pathname.split("/");
  const idx = segments.indexOf("mentors");
  return idx !== -1 && segments[idx + 1] ? segments[idx + 1] : null;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const whereClause: { mentorId: string; month?: number; year?: number } = { mentorId };
    if (monthParam) whereClause.month = parseInt(monthParam, 10);
    if (yearParam) whereClause.year = parseInt(yearParam, 10);

    const goals = await prisma.mentorGoal.findMany({
      where: whereClause,
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    });

    return apiSuccess(goals);
  } catch (error) {
    console.error("[GET_MENTOR_GOALS_ERROR]", error);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    const body = await req.json();
    const { title, target, month, year } = body;

    if (!title || !target || !month || !year) {
      return apiError("Missing required fields: title, target, month, year", 400);
    }

    const goal = await prisma.mentorGoal.create({
      data: {
        mentorId,
        title,
        target: parseInt(target, 10),
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
    });

    return apiSuccess(goal);
  } catch (error) {
    console.error("[POST_MENTOR_GOALS_ERROR]", error);
    return apiServerError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    const body = await req.json();
    const { goalId, current, isCompleted } = body;

    if (!goalId) return apiError("Goal ID is required", 400);

    const dataToUpdate: { current?: number; isCompleted?: boolean } = {};
    if (current !== undefined) dataToUpdate.current = parseInt(current, 10);
    if (isCompleted !== undefined) dataToUpdate.isCompleted = Boolean(isCompleted);

    const goal = await prisma.mentorGoal.update({
      where: { id: goalId, mentorId },
      data: dataToUpdate,
    });

    return apiSuccess(goal);
  } catch (error) {
    console.error("[PATCH_MENTOR_GOALS_ERROR]", error);
    return apiServerError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const mentorId = getMentorId(req);
    if (!mentorId) return apiError("Mentor ID is required", 400);

    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get("goalId");

    if (!goalId) return apiError("Goal ID is required", 400);

    await prisma.mentorGoal.delete({
      where: { id: goalId, mentorId },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE_MENTOR_GOALS_ERROR]", error);
    return apiServerError();
  }
}
