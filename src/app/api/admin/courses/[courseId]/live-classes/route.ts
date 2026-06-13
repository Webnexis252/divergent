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
 * GET /api/admin/courses/[courseId]/live-classes
 * Lists all live classes for a specific course. Admin/Super Admin only.
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

    const liveClasses = await prisma.liveClass.findMany({
      where: { courseId },
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        duration: true,
        meetingUrl: true,
        recordingUrl: true,
        isEnded: true,
        createdAt: true,
      },
    });

    return apiSuccess(liveClasses);
  } catch (err) {
    console.error('[ADMIN_COURSE_LIVE_CLASSES_GET_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/admin/courses/[courseId]/live-classes
 * Creates a new live class for the specified course. Admin/Super Admin only.
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
    const { title, description, startTime, duration, meetingUrl } = body;

    if (!title?.trim()) return apiError('Title is required', 400);
    if (!startTime) return apiError('Start time is required', 400);
    if (!duration || duration < 1) return apiError('Duration must be at least 1 minute', 400);

    const liveClass = await prisma.liveClass.create({
      data: {
        courseId,
        title: title.trim(),
        description: description?.trim() || null,
        startTime: new Date(startTime),
        duration: Number(duration),
        meetingUrl: meetingUrl?.trim() || null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        duration: true,
        meetingUrl: true,
        recordingUrl: true,
        isEnded: true,
        createdAt: true,
      },
    });

    // Notify enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: { userId: true },
    });
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: `New Live Class: ${title}`,
          body: `A new live class has been scheduled for ${course.title}. Join on time!`,
          type: 'INFO' as const,
          actionUrl: `/dashboard/live-classes`,
        })),
      });
    }

    return apiCreated(liveClass, 'Live class scheduled successfully');
  } catch (err) {
    console.error('[ADMIN_COURSE_LIVE_CLASSES_POST_ERROR]', err);
    return apiServerError();
  }
}
