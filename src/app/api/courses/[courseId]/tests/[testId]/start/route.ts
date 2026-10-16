import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { courseRelation } from '@/lib/course-access';
import { attemptQuestionIds, lockTestAttempts, questionOrderForNewAttempt } from '@/lib/test-attempts';
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';

/**
 * POST /api/courses/[courseId]/tests/[testId]/start
 * Starts (or resumes) a test attempt for a student enrolled in the course, or
 * for the course's teachers and admins. Creates a TestAttempt, shuffles
 * questions if configured, returns questions (without answers).
 *
 * Checking for an unfinished attempt, counting used attempts and creating the
 * new one are serialised per student and test, so double-clicking Start can't
 * create two attempts or get past `maxAttempts`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const { courseId, testId } = await params;
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const relation = await courseRelation(user, courseId);
    if (relation === 'none') return apiForbidden('Enroll in this course to take its tests');
    const isManager = relation === 'manager';

    // Fetch the test with its questions
    const test = await prisma.courseTest.findFirst({
      where: {
        id: testId,
        courseId,
        ...(isManager ? {} : { status: 'PUBLISHED' as const }),
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        parts: { orderBy: { order: 'asc' } },
      },
    });
    if (!test) return apiNotFound('Test');

    // Check availability window for students
    const now = new Date();
    if (!isManager) {
      if (test.availableFrom && now < test.availableFrom) {
        return apiError('This test is not yet available', 403);
      }
      if (test.availableUntil && now > test.availableUntil) {
        return apiError('This test is no longer available', 403);
      }
    }

    const outcome = await prisma.$transaction(async (tx) => {
      await lockTestAttempts(tx, user.userId, testId);

      // Resume an attempt that was started but not submitted
      const inProgress = await tx.testAttempt.findFirst({
        where: { testId, userId: user.userId, submittedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, startedAt: true, questionOrder: true },
      });
      if (inProgress) return { kind: 'resumed' as const, attempt: inProgress };

      if (test.maxAttempts !== -1) {
        const used = await tx.testAttempt.count({
          where: { testId, userId: user.userId, submittedAt: { not: null } },
        });
        if (used >= test.maxAttempts) return { kind: 'limit' as const };
      }

      const questionIds = questionOrderForNewAttempt(
        { shuffleQuestions: test.shuffleQuestions, questionsToShow: test.questionsToShow, hasParts: test.parts.length > 0 },
        test.questions,
      );
      const attempt = await tx.testAttempt.create({
        data: {
          testId,
          userId: user.userId,
          score: 0,
          isPassed: false,
          answers: {},
          questionOrder: questionIds,
          totalPoints: test.questions
            .filter((q) => questionIds.includes(q.id))
            .reduce((sum, q) => sum + q.points, 0),
        },
        select: { id: true, startedAt: true, questionOrder: true },
      });
      return { kind: 'created' as const, attempt };
    });

    if (outcome.kind === 'limit') {
      return apiError(
        `Maximum attempts reached (${test.maxAttempts}). You cannot retake this test.`,
        403
      );
    }

    // Return sanitized questions (no correctAnswer or explanation), in the attempt's order
    const questionOrder = attemptQuestionIds(outcome.attempt.questionOrder) ?? test.questions.map((q) => q.id);
    const orderedQuestions = questionOrder
      .map((qId) => test.questions.find((q) => q.id === qId))
      .filter((q): q is (typeof test.questions)[number] => Boolean(q))
      .map((q) => ({
        id: q.id,
        type: q.type,
        category: q.category,
        prompt: q.prompt,
        options: q.options,
        imageUrl: q.imageUrl,
        points: q.points,
        order: q.order,
      }));

    // Calculate remaining time
    const totalSecs = test.durationMins * 60;
    const elapsed = Math.max(0, Math.floor((now.getTime() - outcome.attempt.startedAt.getTime()) / 1000));
    const remainingSecs = Math.max(0, totalSecs - elapsed);

    return apiCreated({
      attemptId: outcome.attempt.id,
      resumed: outcome.kind === 'resumed',
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        durationMins: test.durationMins,
        remainingSecs,
        totalQuestions: orderedQuestions.length,
        parts: test.parts,
      },
      questions: orderedQuestions,
    });
  } catch (err) {
    console.error('[START_TEST_ERROR]', err);
    return apiServerError();
  }
}
