import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiNotFound, apiForbidden, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ classId: string }> };

/**
 * GET /api/live-classes/[classId]/recording
 * Returns the recording details for a specific live class.
 * Only accessible by enrolled students, course teachers, admins, and super admins.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { classId } = await params;

    const liveClass = await prisma.liveClass.findUnique({
      where: { id: classId },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        duration: true,
        recordingUrl: true,
        courseId: true,
        course: {
          select: {
            title: true,
            slug: true,
            teachers: {
              select: { id: true, name: true, image: true },
            },
          },
        },
        _count: {
          select: {
            attendances: {
              where: { isCounted: true },
            },
          },
        },
      },
    });

    if (!liveClass) return apiNotFound('Live class');

    // Access control
    if (auth.role === 'STUDENT') {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: auth.userId,
          courseId: liveClass.courseId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!enrollment) return apiForbidden('You are not enrolled in this course');
    } else if (auth.role === 'MENTOR') {
      const isCourseTeacher = liveClass.course.teachers.some((t) => t.id === auth.userId);
      if (!isCourseTeacher) return apiForbidden('You are not a teacher for this course');
    }
    // ADMIN and SUPER_ADMIN always have access

    return apiSuccess({
      id: liveClass.id,
      title: liveClass.title,
      description: liveClass.description,
      startTime: liveClass.startTime.toISOString(),
      duration: liveClass.duration,
      recordingUrl: liveClass.recordingUrl,
      courseTitle: liveClass.course.title,
      courseSlug: liveClass.course.slug,
      teacher: liveClass.course.teachers[0] ?? null,
      attendeeCount: liveClass._count.attendances,
    });
  } catch (err) {
    console.error('[GET_RECORDING_ERROR]', err);
    return apiServerError();
  }
}
