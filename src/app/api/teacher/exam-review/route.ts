import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError, apiForbidden, apiServerError } from "@/lib/api-response";

/**
 * GET /api/teacher/exam-review
 * Returns all TestAttempts with gradingStatus = PENDING_REVIEW for the teacher's courses.
 *
 * PATCH /api/teacher/exam-review
 * Grades one or more sketch questions on a specific attempt.
 * Body: { attemptId, sketchGrades: { [questionId]: { points, feedback? } } }
 */

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!user) return apiForbidden("Unauthorized");

    const whereClause =
      user.role === "MENTOR"
        ? { gradingStatus: "PENDING_REVIEW", test: { course: { teachers: { some: { id: user.userId } } } } }
        : { gradingStatus: "PENDING_REVIEW" };

    const attempts = await prisma.testAttempt.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        test: {
          include: {
            questions: {
              where: { type: "SKETCH" },
              orderBy: { order: "asc" },
              select: {
                id: true,
                prompt: true,
                referenceImage: true,
                points: true,
                order: true,
              },
            },
            course: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    // Shape the data for the frontend
    const reviews = attempts.map((attempt) => ({
      attemptId: attempt.id,
      student: attempt.user,
      exam: {
        id: attempt.testId,
        title: attempt.test.title,
        courseTitle: attempt.test.course.title,
      },
      submittedAt: attempt.submittedAt,
      provisionalScore: attempt.score,
      sketchQuestions: attempt.test.questions.map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        referenceImage: q.referenceImage,
        maxPoints: q.points,
        studentAnswer: (attempt.answers as Record<string, unknown>)[q.id] ?? null,
        existingGrade: (attempt.sketchGrades as Record<string, { points: number; feedback?: string }> | null)?.[q.id] ?? null,
      })),
      totalSketchPoints: attempt.test.questions.reduce((s, q) => s + q.points, 0),
    }));

    return apiSuccess({ reviews, count: reviews.length });
  } catch (err) {
    console.error("[EXAM_REVIEW_GET_ERROR]", err);
    return apiServerError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!user) return apiForbidden("Unauthorized");

    const body = await req.json();
    const { attemptId, sketchGrades } = body as {
      attemptId: string;
      sketchGrades: Record<string, { points: number; feedback?: string }>;
    };

    if (!attemptId || !sketchGrades || typeof sketchGrades !== "object") {
      return apiError("attemptId and sketchGrades are required", 400);
    }

    // Load the attempt with full question data
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            course: { select: { teachers: { select: { id: true } } } },
            questions: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!attempt) return apiError("Attempt not found", 404);

    // Mentors can only grade their own course's attempts
    if (user.role === "MENTOR" && !attempt.test.course?.teachers.some((t) => t.id === user.userId)) {
      return apiForbidden("You can only grade attempts from your own courses");
    }

    // Validate that grades don't exceed max points
    for (const q of attempt.test.questions.filter((q) => q.type === "SKETCH")) {
      const grade = sketchGrades[q.id];
      if (grade && grade.points > q.points) {
        return apiError(`Points for question ${q.id} exceed max allowed (${q.points})`, 400);
      }
    }

    // Merge new sketch grades with any existing ones
    const existingGrades = (attempt.sketchGrades as Record<string, { points: number; feedback?: string }>) ?? {};
    const mergedGrades = { ...existingGrades, ...sketchGrades };

    // Recalculate total score including sketch points
    const sketchPointsEarned = Object.values(mergedGrades).reduce((s, g) => s + (g.points ?? 0), 0);
    const newPointsEarned = attempt.pointsEarned + sketchPointsEarned;
    const newScore = attempt.totalPoints > 0
      ? Math.round((newPointsEarned / attempt.totalPoints) * 100)
      : 0;
    const isPassed = newScore >= attempt.test.passingScore;

    // Check if all sketch questions are now graded
    const sketchQuestionIds = attempt.test.questions.filter((q) => q.type === "SKETCH").map((q) => q.id);
    const allGraded = sketchQuestionIds.every((id) => mergedGrades[id] !== undefined);
    const newGradingStatus = allGraded ? "FULLY_GRADED" : "PENDING_REVIEW";

    // Update the attempt
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        sketchGrades: mergedGrades,
        pointsEarned: newPointsEarned,
        score: newScore,
        isPassed,
        gradingStatus: newGradingStatus,
      },
    });

    // Award XP if now fully graded and passed
    if (newGradingStatus === "FULLY_GRADED" && isPassed) {
      await prisma.user.update({
        where: { id: attempt.userId },
        data: { xpPoints: { increment: Math.round(sketchPointsEarned * 10) } },
      });
    }

    return apiSuccess({
      attemptId,
      newScore,
      newPointsEarned,
      gradingStatus: newGradingStatus,
      isPassed,
    }, allGraded ? "All sketches graded — final result updated" : "Sketch grades saved");
  } catch (err) {
    console.error("[EXAM_REVIEW_PATCH_ERROR]", err);
    return apiServerError();
  }
}
