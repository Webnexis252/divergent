import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyToken } from '@/lib/auth';
import { UpdateCourseTestSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string; testId: string }> };

/**
 * GET /api/courses/[courseId]/tests/[testId]
 * Get full test details. Students see questions only when taking the test.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { courseId, testId } = await params;
    const auth = await verifyToken(req);
    const isPrivileged =
      auth?.role === 'ADMIN' ||
      auth?.role === 'SUPER_ADMIN' ||
      auth?.role === 'MENTOR';

    const test = await prisma.courseTest.findFirst({
      where: {
        id: testId,
        courseId,
        ...(isPrivileged ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        chapter: { select: { id: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
        // Admins/mentors can see questions; students see question count only
        ...(isPrivileged
          ? {
              questions: { orderBy: { order: 'asc' } },
            }
          : {}),
        // Include the current user's past attempts
        ...(auth
          ? {
              attempts: {
                where: { userId: auth.userId },
                select: {
                  id: true,
                  score: true,
                  isPassed: true,
                  startedAt: true,
                  submittedAt: true,
                  timeSpentSecs: true,
                },
                orderBy: { createdAt: 'desc' },
              },
            }
          : {}),
      },
    });

    if (!test) return apiNotFound('Test');
    return apiSuccess(test);
  } catch (err) {
    console.error('[GET_COURSE_TEST_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/courses/[courseId]/tests/[testId]
 * Admin/Mentor: Update test settings
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { courseId, testId } = await params;
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins/mentors can edit tests');

    const body = await req.json();
    const parsed = UpdateCourseTestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const existing = await prisma.courseTest.findFirst({
      where: { id: testId, courseId },
      select: { id: true },
    });
    if (!existing) return apiNotFound('Test');

    const {
      title,
      description,
      type,
      status,
      durationMins,
      passingScore,
      maxAttempts,
      shuffleQuestions,
      showResults,
      questionsToShow,
      availableFrom,
      availableUntil,
      chapterId,
    } = parsed.data;

    const updated = await prisma.courseTest.update({
      where: { id: testId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(durationMins !== undefined && { durationMins }),
        ...(passingScore !== undefined && { passingScore }),
        ...(maxAttempts !== undefined && { maxAttempts }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(showResults !== undefined && { showResults }),
        ...(questionsToShow !== undefined && { questionsToShow: questionsToShow ?? null }),
        ...(availableFrom !== undefined && { availableFrom: availableFrom ? new Date(availableFrom) : null }),
        ...(availableUntil !== undefined && { availableUntil: availableUntil ? new Date(availableUntil) : null }),
        ...(chapterId !== undefined && { chapterId: chapterId ?? null }),
      },
      include: {
        _count: { select: { questions: true, attempts: true } },
        chapter: { select: { id: true, title: true } },
      },
    });

    return apiSuccess(updated, 'Test updated successfully');
  } catch (err) {
    console.error('[UPDATE_COURSE_TEST_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/courses/[courseId]/tests/[testId]
 * Admin only: Delete a test and all its questions/attempts
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { courseId, testId } = await params;
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can delete tests');

    const existing = await prisma.courseTest.findFirst({
      where: { id: testId, courseId },
      select: { id: true },
    });
    if (!existing) return apiNotFound('Test');

    await prisma.courseTest.delete({ where: { id: testId } });
    return apiSuccess({ deleted: true }, 'Test deleted successfully');
  } catch (err) {
    console.error('[DELETE_COURSE_TEST_ERROR]', err);
    return apiServerError();
  }
}
