import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/admin/dashboard
 * Admin only: Returns a high-level platform overview.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Admin access required');

    const [totalStudents, totalCourses, totalEnrollments, openDoubts, totalMentors] =
      await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.course.count(),
        prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
        prisma.doubtTicket.count({ where: { status: { in: ['OPEN', 'ASSIGNED'] } } }),
        prisma.user.count({ where: { role: 'MENTOR' } }),
      ]);

    return apiSuccess({
      totalStudents,
      totalCourses,
      totalEnrollments,
      openDoubts,
      totalMentors,
    });
  } catch (err) {
    console.error('[ADMIN_DASHBOARD_ERROR]', err);
    return apiServerError();
  }
}
