import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { gradeQuestionAnswer } from "@/lib/test-grading";
import {

  apiCreated,
  apiError,
  apiForbidden,
  apiServerError,
} from "@/lib/api-response";

/**
 * POST /api/courses/[courseId]/tests/[testId]/submit
 *
 * Accepts student answers and auto-grades SCQ / MCQ / NUMERIC instantly.
 * SKETCH answers are stored and flagged for teacher manual review.
 *
 * Body: { answers: { [questionId]: string | string[] }, timeSpentSecs?: number }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const user = await requireAuth(req, ["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"]);
    if (!user) return apiForbidden("Unauthorized");

    const { testId } = await params;
    const body = await req.json();
    const { answers, timeSpentSecs } = body as {
      answers: Record<string, string | string[]>;
      timeSpentSecs?: number;
    };

    if (!answers || typeof answers !== "object") {
      return apiError("answers object is required", 400);
    }

    // Load exam + all questions
    const exam = await prisma.courseTest.findUnique({
      where: { id: testId },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!exam) return apiError("Exam not found", 404);

    // Prevent double-submission when maxAttempts === 1
    if (exam.maxAttempts === 1) {
      const existing = await prisma.testAttempt.findFirst({
        where: { testId, userId: user.userId, submittedAt: { not: null } },
      });
      if (existing) return apiError("You have already submitted this exam", 409);
    }

    // ─── Grade each question ───────────────────────────────────────────────
    let autoPointsEarned = 0;
    let totalPoints = 0;
    let hasSketch = false;

    const questionResults: Record<
      string,
      {
        type: string;
        isCorrect: boolean | null; // null for SKETCH (needs manual grading)
        pointsAwarded: number;
        correctAnswer?: unknown;
        explanation?: string | null;
      }
    > = {};

    for (const q of exam.questions) {
      totalPoints += q.points;
      const studentAnswer = answers[q.id];
      const gradedResult = gradeQuestionAnswer(
        {
          type: q.type,
          points: q.points,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
        },
        studentAnswer,
        { includeAnswerKey: exam.showResults }
      );

      if (gradedResult.isCorrect === null) {
        hasSketch = true;
      }

      autoPointsEarned += gradedResult.pointsAwarded;
      questionResults[q.id] = gradedResult;
    }

    // ─── Provisional score (auto-graded questions only) ────────────────────
    const sketchPoints = exam.questions
      .filter((q) => q.type === "SKETCH")
      .reduce((sum, q) => sum + q.points, 0);
    const autoGradedMax = totalPoints - sketchPoints;

    const score =
      autoGradedMax > 0
        ? Math.round((autoPointsEarned / autoGradedMax) * 100)
        : 0;

    const isPassed = !hasSketch && score >= exam.passingScore;
    const gradingStatus = hasSketch ? "PENDING_REVIEW" : "AUTO_GRADED";

    // ─── Award XP for passing (only on full grading) ───────────────────────
    if (!hasSketch && isPassed) {
      await prisma.user.update({
        where: { id: user.userId },
        data: { xpPoints: { increment: Math.round(autoPointsEarned * 10) } },
      });
    }

    // ─── Save attempt ──────────────────────────────────────────────────────
    const attempt = await prisma.testAttempt.create({
      data: {
        testId,
        userId: user.userId,
        answers,
        score,
        pointsEarned: autoPointsEarned,
        totalPoints,
        isPassed,
        gradingStatus,
        submittedAt: new Date(),
        timeSpentSecs: timeSpentSecs ?? null,
        questionOrder: exam.questions.map((q) => q.id),
      },
    });

    return apiCreated(
      {
        attemptId: attempt.id,
        score,
        pointsEarned: autoPointsEarned,
        totalPoints,
        isPassed,
        gradingStatus,
        passingScore: exam.passingScore,
        questionResults,
      },
      gradingStatus === "AUTO_GRADED"
        ? isPassed
          ? "Congratulations! You passed the exam!"
          : "Exam submitted. Better luck next time!"
        : "Exam submitted. Your sketches are pending teacher review — provisional score shown."
    );
  } catch (err) {
    console.error("[EXAM_SUBMIT_ERROR]", err);
    return apiServerError();
  }
}
