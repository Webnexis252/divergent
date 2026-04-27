import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { gradeQuestionAnswer } from '@/lib/test-grading';
import {
  apiSuccess,
  apiNotFound,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/courses/[courseId]/tests/[testId]/results
 * Authenticated user: Get their attempt results for this test.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const { courseId, testId } = await params;
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const test = await prisma.courseTest.findFirst({
      where: { id: testId, courseId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        durationMins: true,
        passingScore: true,
        maxAttempts: true,
        showResults: true,
        _count: { select: { questions: true } },
        questions: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            type: true,
            category: true,
            prompt: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            points: true,
            order: true,
            difficulty: true,
          },
        },
      },
    });
    if (!test) return apiNotFound('Test');

    const attempts = await prisma.testAttempt.findMany({
      where: { testId, userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    if (attempts.length === 0) {
      return apiSuccess({
        test: {
          id: test.id,
          title: test.title,
          description: test.description,
          type: test.type,
          totalQuestions: test._count.questions,
          passingScore: test.passingScore,
          maxAttempts: test.maxAttempts,
        },
        attempts: [],
        message: 'You have not attempted this test yet.',
      });
    }

    // Build detailed results for each attempt
    const detailedAttempts = attempts.map((attempt) => {
      const answers = attempt.answers as Record<string, unknown>;
      const questionOrder = (attempt.questionOrder as string[]) || test.questions.map((q) => q.id);

      // Always build the grading breakdown so summary analytics stay accurate.
      let questionBreakdown = null;
      if (attempt.submittedAt) {
        questionBreakdown = questionOrder
          .map((qId) => {
            const q = test.questions.find((tq) => tq.id === qId);
            if (!q) return null;
            const userAnswer = answers[q.id];
            const gradedResult = gradeQuestionAnswer(
              {
                type: q.type,
                points: q.points,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
              },
              userAnswer,
              { includeAnswerKey: test.showResults }
            );
            return {
              id: q.id,
              prompt: q.prompt,
              type: q.type,
              category: q.category,
              options: q.options,
              correctAnswer: gradedResult.correctAnswer,
              userAnswer,
              isCorrect: gradedResult.isCorrect,
              explanation: gradedResult.explanation,
              points: q.points,
              pointsAwarded: gradedResult.pointsAwarded,
              difficulty: q.difficulty,
            };
          })
          .filter(Boolean);
      }

      return {
        id: attempt.id,
        score: attempt.score,
        pointsEarned: attempt.pointsEarned,
        totalPoints: attempt.totalPoints,
        isPassed: attempt.isPassed,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        timeSpentSecs: attempt.timeSpentSecs,
        questionBreakdown,
      };
    });

    // Calculate aggregate stats
    const completedAttempts = detailedAttempts.filter((a) => a.submittedAt);
    const bestScore = completedAttempts.length > 0 ? Math.max(...completedAttempts.map((a) => a.score)) : 0;
    const avgScore = completedAttempts.length > 0
      ? Math.round(completedAttempts.reduce((sum, a) => sum + a.score, 0) / completedAttempts.length)
      : 0;
    const canRetake =
      test.maxAttempts === -1 || completedAttempts.length < test.maxAttempts;

    return apiSuccess({
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        type: test.type,
        durationMins: test.durationMins,
        totalQuestions: test._count.questions,
        passingScore: test.passingScore,
        maxAttempts: test.maxAttempts,
      },
      stats: {
        totalAttempts: completedAttempts.length,
        bestScore,
        avgScore,
        canRetake,
        attemptsRemaining: test.maxAttempts === -1 ? 'unlimited' : test.maxAttempts - completedAttempts.length,
      },
      attempts: detailedAttempts,
    });
  } catch (err) {
    console.error('[GET_TEST_RESULTS_ERROR]', err);
    return apiServerError();
  }
}
