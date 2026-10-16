import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyToken } from '@/lib/auth';
import { canManageCourse } from '@/lib/course-access';
import { CreateCourseTestSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/courses/[courseId]/tests
 * - Students: see PUBLISHED tests with their attempt counts
 * - Teachers/Admins: see all tests (including DRAFT)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const auth = await verifyToken(req);
    // Drafts are for this course's teachers and admins, not every teacher
    const isPrivileged = auth ? await canManageCourse(auth, courseId) : false;

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) return apiNotFound('Course');

    const tests = await prisma.courseTest.findMany({
      where: {
        courseId,
        ...(isPrivileged ? {} : { status: 'PUBLISHED' }),
      },
      include: {
        _count: { select: { questions: true, attempts: true } },
        chapter: { select: { id: true, title: true } },
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
                },
                orderBy: { createdAt: 'desc' },
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(tests);
  } catch (err) {
    console.error('[GET_COURSE_TESTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/courses/[courseId]/tests
 * Admin/Mentor: Create a new course test
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins/mentors can create tests');
    if (!(await canManageCourse(user, courseId))) {
      return apiForbidden('You can only add tests to courses you teach');
    }

    const body = await req.json();
    const parsed = CreateCourseTestSchema.safeParse({ ...body, courseId });
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) return apiNotFound('Course');

    // If chapterId, verify it belongs to this course
    if (parsed.data.chapterId) {
      const chapter = await prisma.chapter.findFirst({
        where: { id: parsed.data.chapterId, courseId },
        select: { id: true },
      });
      if (!chapter) return apiError('Chapter not found or does not belong to this course', 400);
    }

    const {
      title,
      description,
      type,
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

    const test = await prisma.courseTest.create({
      data: {
        courseId,
        chapterId: chapterId ?? null,
        title,
        description,
        type,
        durationMins,
        passingScore,
        maxAttempts,
        shuffleQuestions,
        showResults,
        questionsToShow: questionsToShow ?? null,
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        availableUntil: availableUntil ? new Date(availableUntil) : null,
      },
      include: {
        _count: { select: { questions: true } },
        chapter: { select: { id: true, title: true } },
      },
    });

    return apiCreated(test, 'Test created successfully');
  } catch (err) {
    console.error('[CREATE_COURSE_TEST_ERROR]', err);
    return apiServerError();
  }
}
