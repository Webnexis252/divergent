import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';

/**
 * GET /api/admin/overview
 * High-level KPI stats for the admin overview page.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalStudents,
      activeEnrollments,
      openDoubts,
      publishedCourses,
      newStudentsThisWeek,
      recentEnrollments,
      recentDoubts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.enrollment.count({ where: { status: 'ACTIVE' } }),
      prisma.doubtTicket.count({ where: { status: { in: ['OPEN', 'ASSIGNED'] } } }),
      prisma.course.count({ where: { isPublished: true } }),
      prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: sevenDaysAgo } } }),
      prisma.enrollment.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: {
          user: { select: { name: true, email: true } },
          course: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.doubtTicket.findMany({
        where: { status: 'OPEN' },
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return apiSuccess({
      kpis: {
        totalStudents,
        activeEnrollments,
        openDoubts,
        publishedCourses,
        newStudentsThisWeek,
      },
      recentEnrollments: recentEnrollments.map(e => ({
        studentName: e.user.name,
        studentEmail: e.user.email,
        courseTitle: e.course.title,
        createdAt: e.createdAt.toISOString(),
      })),
      recentDoubts: recentDoubts.map(d => ({
        id: d.id,
        subject: d.subject,
        studentName: d.student.name,
        priority: d.priority,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error('[ADMIN_OVERVIEW_ERROR]', err);
    return apiServerError();
  }
}
