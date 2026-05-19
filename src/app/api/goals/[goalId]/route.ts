import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiUnauthorized, apiServerError, apiNotFound } from "@/lib/api-response";

/**
 * PATCH /api/goals/[goalId]
 * Toggle completion status of a goal or update its progress.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { goalId } = await params;
    const body = await req.json();
    
    // Both students and teachers can update a goal, but we need to ensure they have access.
    const existingGoal = await prisma.studentGoal.findUnique({
      where: { id: goalId }
    });

    if (!existingGoal) {
      return apiNotFound("Goal");
    }

    if (
      auth.role === "STUDENT" && existingGoal.studentId !== auth.userId
    ) {
      return apiUnauthorized("You can only update your own goals.");
    }
    // Depending on business rules, maybe check if teacher is allowed, but MENTOR/ADMIN covers it usually.

    const { isCompleted, current } = body;
    const updateData: any = {};
    
    if (typeof isCompleted === "boolean") {
      updateData.isCompleted = isCompleted;
      if (isCompleted) {
        updateData.current = existingGoal.target; // max out current if completed
      }
    }
    
    if (typeof current === "number") {
      updateData.current = current;
      if (current >= existingGoal.target) {
        updateData.isCompleted = true;
      }
    }

    const updatedGoal = await prisma.studentGoal.update({
      where: { id: goalId },
      data: updateData,
    });

    return apiSuccess(updatedGoal);
  } catch (error) {
    console.error("[PATCH_GOAL_ERROR]", error);
    return apiServerError();
  }
}

/**
 * DELETE /api/goals/[goalId]
 * Allows teachers to delete a student's goal.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const auth = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiUnauthorized();

    const { goalId } = await params;
    
    await prisma.studentGoal.delete({
      where: { id: goalId },
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    console.error("[DELETE_GOAL_ERROR]", error);
    return apiServerError();
  }
}
