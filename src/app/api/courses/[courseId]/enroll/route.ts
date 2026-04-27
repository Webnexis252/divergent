import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';
import { ensureActiveEnrollmentWithXp } from '@/lib/xp';

type Params = { params: Promise<{ courseId: string }> };

/**
 * POST /api/courses/[courseId]/enroll
 * Student only: Enroll the authenticated student in a course.
 * In production this will be triggered AFTER payment confirmation (Razorpay webhook).
 * For prototype: manual enrollment.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can enroll in courses');

    const { courseId } = await params;

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return apiNotFound('Course');
    if (!course.isPublished) return apiError('This course is not yet available', 403);

    const result = await ensureActiveEnrollmentWithXp(user.userId, courseId, 'ACTIVE', false);
    if (!result.created) return apiError('You are already enrolled in this course', 409);

    return apiCreated(
      {
        ...result.enrollment,
        course: { title: course.title, slug: course.slug },
      },
      `Successfully enrolled in "${course.title}"`,
    );
  } catch (err) {
    console.error('[ENROLL_ERROR]', err);
    return apiServerError();
  }
}

/**
 * GET /api/courses/[courseId]/enroll
 * Check if the authenticated user is enrolled in a course.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { courseId } = await params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.userId, courseId } },
    });

    return apiSuccess({ enrolled: !!enrollment, enrollment });
  } catch (err) {
    console.error('[CHECK_ENROLLMENT_ERROR]', err);
    return apiServerError();
  }
}
