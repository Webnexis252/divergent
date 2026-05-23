import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiCreated,
  apiError,
  apiNotFound,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';

/**
 * POST /api/courses/[courseId]/tests/[testId]/start
 * Authenticated student: Start a test attempt.
 * Creates a TestAttempt, shuffles questions if configured, returns questions (without answers).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const { courseId, testId } = await params;
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const isPrivileged =
      user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      user.role === 'MENTOR';

    // Fetch the test with its questions
    const test = await prisma.courseTest.findFirst({
      where: { 
        id: testId, 
        courseId, 
        ...(isPrivileged ? {} : { status: 'PUBLISHED' }) 
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!test) return apiNotFound('Test');

    // Check availability window for students
    const now = new Date();
    if (!isPrivileged) {
      if (test.availableFrom && now < test.availableFrom) {
        return apiError('This test is not yet available', 403);
      }
      if (test.availableUntil && now > test.availableUntil) {
        return apiError('This test is no longer available', 403);
      }
    }

    // Check max attempts
    if (test.maxAttempts !== -1) {
      const attemptCount = await prisma.testAttempt.count({
        where: { testId, userId: user.userId, submittedAt: { not: null } },
      });
      if (attemptCount >= test.maxAttempts) {
        return apiError(
          `Maximum attempts reached (${test.maxAttempts}). You cannot retake this test.`,
          403
        );
      }
    }

    // Check for an in-progress attempt (started but not submitted)
    const inProgress = await prisma.testAttempt.findFirst({
      where: { testId, userId: user.userId, submittedAt: null },
      select: { id: true, startedAt: true, questionOrder: true },
    });

    if (inProgress) {
      // Resume existing attempt — return the same question order
      const questionOrder = (inProgress.questionOrder as string[]) || test.questions.map((q) => q.id);
      const orderedQuestions = questionOrder
        .map((qId) => test.questions.find((q) => q.id === qId))
        .filter(Boolean)
        .map((q) => ({
          id: q!.id,
          type: q!.type,
          category: q!.category,
          prompt: q!.prompt,
          options: q!.options,
          imageUrl: q!.imageUrl,
          points: q!.points,
          order: q!.order,
        }));

      // Calculate remaining time
      const elapsed = Math.floor((now.getTime() - inProgress.startedAt.getTime()) / 1000);
      const remainingSecs = Math.max(0, test.durationMins * 60 - elapsed);

      return apiCreated({
        attemptId: inProgress.id,
        resumed: true,
        test: {
          id: test.id,
          title: test.title,
          description: test.description,
          durationMins: test.durationMins,
          remainingSecs,
          totalQuestions: orderedQuestions.length,
        },
        questions: orderedQuestions,
      });
    }

    // Build question order (shuffle if configured, limit if configured)
    let questionsPool = test.questions.slice();
    if (test.shuffleQuestions) {
      questionsPool = shuffleArray(questionsPool);
    }
    
    // Group by type: SCQ -> MCQ -> NUMERIC -> SKETCH
    const typeOrder = { 'SCQ': 1, 'MCQ': 2, 'NUMERIC': 3, 'SKETCH': 4 };
    questionsPool.sort((a, b) => typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder]);

    let questionIds = questionsPool.map((q) => q.id);
    if (test.questionsToShow && test.questionsToShow < questionIds.length) {
      // Apply limit per type if possible, or just slice. We'll just slice for now.
      questionIds = questionIds.slice(0, test.questionsToShow);
    }

    // Create the attempt
    const attempt = await prisma.testAttempt.create({
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
    });

    // Return sanitized questions (no correctAnswer or explanation)
    const orderedQuestions = questionIds
      .map((qId) => test.questions.find((q) => q.id === qId))
      .filter(Boolean)
      .map((q) => ({
        id: q!.id,
        type: q!.type,
        category: q!.category,
        prompt: q!.prompt,
        options: q!.options,
        imageUrl: q!.imageUrl,
        points: q!.points,
        order: q!.order,
      }));

    return apiCreated({
      attemptId: attempt.id,
      resumed: false,
      test: {
        id: test.id,
        title: test.title,
        description: test.description,
        durationMins: test.durationMins,
        remainingSecs: test.durationMins * 60,
        totalQuestions: orderedQuestions.length,
      },
      questions: orderedQuestions,
    });
  } catch (err) {
    console.error('[START_TEST_ERROR]', err);
    return apiServerError();
  }
}

/** Fisher-Yates shuffle */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
