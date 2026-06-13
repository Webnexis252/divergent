import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string }> };

/**
 * GET /api/admin/courses/[courseId]/exams
 * Lists all exams (CourseTest) for a specific course. Admin/Super Admin only.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) return apiNotFound('Course');

    const exams = await prisma.courseTest.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        durationMins: true,
        passingScore: true,
        maxAttempts: true,
        availableFrom: true,
        availableUntil: true,
        createdAt: true,
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return apiSuccess(exams);
  } catch (err) {
    console.error('[ADMIN_COURSE_EXAMS_GET_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/admin/courses/[courseId]/exams
 * Creates a new exam (CourseTest) for the specified course. Admin/Super Admin only.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) return apiNotFound('Course');

    const body = await req.json();
    const {
      title,
      description,
      type = 'COURSE_EXAM',
      durationMins = 60,
      passingScore = 50,
      maxAttempts = 1,
      shuffleQuestions = true,
      showResults = true,
      availableFrom,
    } = body;

    if (!title?.trim()) return apiError('Title is required', 400);

    const validTypes = ['COURSE_EXAM', 'MOCK_TEST', 'CHAPTER_TEST'];
    if (!validTypes.includes(type)) return apiError('Invalid exam type', 400);

    const exam = await prisma.courseTest.create({
      data: {
        courseId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        status: 'PUBLISHED',
        durationMins: Number(durationMins) || 60,
        passingScore: Number(passingScore) || 50,
        maxAttempts: Number(maxAttempts) || 1,
        shuffleQuestions: Boolean(shuffleQuestions),
        showResults: Boolean(showResults),
        availableFrom: availableFrom ? new Date(availableFrom) : null,
        // Create a default Part + Section so questions can be added immediately
        parts: {
          create: [
            {
              title: 'Part 1',
              order: 0,
              durationMins: Number(durationMins) || 60,
              sections: {
                create: [
                  {
                    title: 'Section 1',
                    questionType: 'SCQ',
                    order: 0,
                  },
                ],
              },
            },
          ],
        },
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        durationMins: true,
        passingScore: true,
        maxAttempts: true,
        availableFrom: true,
        availableUntil: true,
        createdAt: true,
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return apiCreated(exam, 'Exam created successfully');
  } catch (err) {
    console.error('[ADMIN_COURSE_EXAMS_POST_ERROR]', err);
    return apiServerError();
  }
}
