import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * GET /api/users/me/stats
 * Returns the authenticated student's dashboard stats:
 * enrollmentCount, streakCount, xpPoints, and enrolled courses with progress.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        streakCount: true,
        xpPoints: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          orderBy: { updatedAt: 'desc' },
          take: 4,
          select: {
            progressPercent: true,
            createdAt: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail: true,
                description: true,
                teachers: {
                  select: {
                    name: true,
                  },
                },
                _count: {
                  select: { chapters: true },
                },
                chapters: {
                  select: {
                    _count: { select: { lessons: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) return apiUnauthorized();

    const enrollmentCount = await prisma.enrollment.count({
      where: { userId: auth.userId, status: 'ACTIVE' },
    });

    const enrolledCourses = user.enrollments.map((e) => {
      const lessonCount = e.course.chapters.reduce(
        (sum, ch) => sum + ch._count.lessons,
        0
      );
      return {
        id: e.course.id,
        title: e.course.title,
        slug: e.course.slug,
        thumbnail: e.course.thumbnail,
        description: e.course.description,
        progressPercent: e.progressPercent,
        meta: `${lessonCount} lesson${lessonCount !== 1 ? 's' : ''}`,
        teacherName: e.course.teachers.map((t) => t.name).join(', ') || null,
        enrolledAt: e.createdAt,
      };
    });

    return apiSuccess({
      enrollmentCount,
      streakCount: user.streakCount,
      xpPoints: user.xpPoints,
      enrolledCourses,
    });
  } catch (err) {
    console.error('[GET_ME_STATS_ERROR]', err);
    return apiServerError();
  }
}
