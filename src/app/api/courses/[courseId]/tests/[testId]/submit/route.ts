import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { courseRelation } from "@/lib/course-access";
import { attemptQuestionIds, lockTestAttempts, scoreSubmission } from "@/lib/test-attempts";
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiUnauthorized,
} from "@/lib/api-response";

/**
 * POST /api/courses/[courseId]/tests/[testId]/submit
 *
 * Finishes the attempt the student began with /start and auto-grades SCQ /
 * MCQ / NUMERIC instantly. SKETCH answers are stored and flagged for teacher
 * manual review.
 *
 * Only students enrolled in the course (or its teachers and admins) can
 * submit, only to a published test, and only an attempt they started. The
 * attempt limit, the save and the XP award happen in one transaction that is
 * serialised per student and test, so parallel submits can't get past
 * `maxAttempts` or earn XP twice.
 *
 * Body: { answers: { [questionId]: string | string[] } }
 * Time spent is measured from the attempt's server-side start, not taken from the client.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { courseId, testId } = await params;
    const body = await req.json().catch(() => null);
    const submitted: unknown = body?.answers;
    if (!submitted || typeof submitted !== "object" || Array.isArray(submitted)) {
      return apiError("answers object is required", 400);
    }

    const relation = await courseRelation(user, courseId);
    if (relation === "none") return apiForbidden("Enroll in this course to take its tests");
    const isManager = relation === "manager";

    const exam = await prisma.courseTest.findFirst({
      where: { id: testId, courseId, ...(isManager ? {} : { status: "PUBLISHED" as const }) },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!exam) return apiNotFound("Test");

    const outcome = await prisma.$transaction(async (tx) => {
      await lockTestAttempts(tx, user.userId, testId);

      const attempt = await tx.testAttempt.findFirst({
        where: { testId, userId: user.userId, submittedAt: null },
        orderBy: { createdAt: "desc" },
      });
      if (!attempt) return { error: "not-started" as const };

      if (exam.maxAttempts !== -1) {
        const used = await tx.testAttempt.count({
          where: { testId, userId: user.userId, submittedAt: { not: null } },
        });
        if (used >= exam.maxAttempts) return { error: "limit" as const };
      }

      // Grade what this attempt showed: a test cut to `questionsToShow` mustn't
      // count the questions the student never saw
      const shownIds = attemptQuestionIds(attempt.questionOrder);
      const questions = shownIds ? exam.questions.filter((q) => shownIds.includes(q.id)) : exam.questions;
      const scored = scoreSubmission(questions, submitted as Record<string, unknown>, {
        passingScore: exam.passingScore,
        showResults: exam.showResults,
      });

      // XP for the first pass only, so retakes of a multi-attempt test can't farm it
      const earnsXp =
        scored.isPassed &&
        (await tx.testAttempt.count({
          where: { testId, userId: user.userId, isPassed: true, submittedAt: { not: null } },
        })) === 0;

      const submittedAt = new Date();
      const saved = await tx.testAttempt.update({
        where: { id: attempt.id },
        data: {
          answers: scored.answers as object,
          score: scored.score,
          pointsEarned: scored.pointsEarned,
          totalPoints: scored.totalPoints,
          isPassed: scored.isPassed,
          gradingStatus: scored.gradingStatus,
          submittedAt,
          timeSpentSecs: Math.max(0, Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)),
        },
      });

      if (earnsXp) {
        await tx.user.update({
          where: { id: user.userId },
          data: { xpPoints: { increment: Math.round(scored.pointsEarned * 10) } },
        });
      }

      return { attempt: saved, scored };
    });

    if ("error" in outcome) {
      return outcome.error === "not-started"
        ? apiError("This test hasn't been started. Start it, then submit your answers.", 409)
        : apiError(`Maximum attempts reached (${exam.maxAttempts}). You cannot retake this test.`, 409);
    }

    const { attempt, scored } = outcome;
    return apiCreated(
      {
        attemptId: attempt.id,
        score: scored.score,
        pointsEarned: scored.pointsEarned,
        totalPoints: scored.totalPoints,
        isPassed: scored.isPassed,
        gradingStatus: scored.gradingStatus,
        passingScore: exam.passingScore,
        questionResults: scored.questionResults,
      },
      scored.gradingStatus === "AUTO_GRADED"
        ? scored.isPassed
          ? "Congratulations! You passed the exam!"
          : "Exam submitted. Better luck next time!"
        : "Exam submitted. Your sketches are pending teacher review — provisional score shown."
    );
  } catch (err) {
    console.error("[EXAM_SUBMIT_ERROR]", err);
    return apiServerError();
  }
}
