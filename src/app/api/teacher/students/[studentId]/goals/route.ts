import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiUnauthorized, apiServerError, apiBadRequest } from "@/lib/api-response";

/**
 * POST /api/teacher/students/[studentId]/goals
 * Creates a new weekly goal for the specified student.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiUnauthorized();

    const { studentId } = await params;
    const body = await req.json();

    const { title, weekStart, target } = body;
    if (!title) {
      return apiBadRequest("Goal title is required");
    }

    // Default to start of current week if not provided
    let goalWeekStart = new Date();
    if (weekStart) {
      goalWeekStart = new Date(weekStart);
    } else {
      goalWeekStart.setDate(goalWeekStart.getDate() - goalWeekStart.getDay());
      goalWeekStart.setHours(0, 0, 0, 0);
    }

    const newGoal = await prisma.studentGoal.create({
      data: {
        title,
        studentId,
        teacherId: auth.userId,
        weekStart: goalWeekStart,
        target: target ? Number(target) : 1,
      },
    });

    return apiSuccess(newGoal);
  } catch (error) {
    console.error("[POST_STUDENT_GOAL_ERROR]", error);
    return apiServerError();
  }
}

/**
 * GET /api/teacher/students/[studentId]/goals
 * Returns the weekly goals for the specified student.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const auth = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiUnauthorized();

    const { studentId } = await params;
    
    // Optionally filter by weekStart via query params
    const url = new URL(req.url);
    const weekStartParam = url.searchParams.get("weekStart");
    
    let whereClause: any = { studentId };
    
    if (weekStartParam) {
      whereClause.weekStart = new Date(weekStartParam);
    }

    const goals = await prisma.studentGoal.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess(goals);
  } catch (error) {
    console.error("[GET_STUDENT_GOALS_ERROR]", error);
    return apiServerError();
  }
}
