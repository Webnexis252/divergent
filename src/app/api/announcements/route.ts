import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * GET /api/announcements
 * Returns announcements visible to the current user:
 * - All announcements with no targetRole (everyone)
 * - Announcements targeting the user's role
 * - Announcements targeting a course the user is enrolled in
 * Sorted: pinned first, then newest first
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });

    // Get course IDs the student is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: auth.userId },
      select: { courseId: true },
    });
    const enrolledCourseIds = enrollments.map((e) => e.courseId);

    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          // Global (no role filter, no course filter)
          { targetRole: null, targetCourseId: null },
          // Targeted to user's role
          { targetRole: user?.role ?? 'STUDENT', targetCourseId: null },
          // Targeted to enrolled courses
          ...(enrolledCourseIds.length > 0
            ? [{ targetCourseId: { in: enrolledCourseIds } }]
            : []),
        ],
      },
      include: {
        author: { select: { name: true, image: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    return apiSuccess(announcements);
  } catch (err) {
    console.error('[ANNOUNCEMENTS_GET_ERROR]', err);
    return apiServerError();
  }
}
