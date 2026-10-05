import { unstable_cache } from 'next/cache';
import prisma from '@/lib/prisma';
import type { AdminOverviewData } from '@/app/admin/overview/_types';

async function loadAdminOverview(): Promise<AdminOverviewData> {
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

  return {
    kpis: {
      totalStudents,
      activeEnrollments,
      openDoubts,
      publishedCourses,
      newStudentsThisWeek,
    },
    recentEnrollments: recentEnrollments.map((e) => ({
      studentName: e.user.name,
      studentEmail: e.user.email,
      courseTitle: e.course.title,
      createdAt: e.createdAt.toISOString(),
    })),
    recentDoubts: recentDoubts.map((d) => ({
      id: d.id,
      subject: d.subject,
      studentName: d.student.name,
      priority: d.priority as AdminOverviewData['recentDoubts'][number]['priority'],
      createdAt: d.createdAt.toISOString(),
    })),
  };
}

/**
 * KPI stats for the admin overview. The numbers are the same for every admin,
 * so they are cached for 30 seconds and shared: at a million students the
 * COUNT(*)s run at most twice a minute instead of on every admin page view.
 * Callers must check the viewer is an ADMIN / SUPER_ADMIN first.
 */
export const getAdminOverview = unstable_cache(loadAdminOverview, ['admin-overview'], {
  revalidate: 30,
  tags: ['admin-overview'],
});
