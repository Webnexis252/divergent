import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/teacher/analytics
 * Returns aggregated class analytics for MENTOR/ADMIN users.
 * Supports optional ?courseId= and ?days= query params.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only mentors and admins can access analytics');

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '7', 10), 1), 365);
    const courseId = searchParams.get('courseId') ?? undefined;
    const cohortId = searchParams.get('cohortId') ?? undefined;

    const now = new Date();
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Resolve cohort → student IDs for filtering
    let cohortUserIds: string[] | undefined;
    if (cohortId) {
      const members = await prisma.cohortStudent.findMany({
        where: { cohortId },
        select: { studentId: true },
      });
      cohortUserIds = members.map((m) => m.studentId);
    }

    // ── Parallel queries ────────────────────────────────────────────────────
    const [
      activeStudents,
      doubtsResolved,
      totalDoubts,
      openDoubts,
      lessonProgressRows,
      recentEnrollments,
      topStudents,
      allEnrollments,
    ] = await Promise.all([
      // Active unique students enrolled
      prisma.enrollment.groupBy({
        by: ['userId'],
        where: {
          status: 'ACTIVE',
          ...(courseId ? { courseId } : {}),
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
      }).then((g) => g.length),

      // Doubts resolved in window
      prisma.doubtTicket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          updatedAt: { gte: windowStart },
          ...(cohortUserIds ? { studentId: { in: cohortUserIds } } : {}),
        },
      }),

      // Total doubts in window
      prisma.doubtTicket.count({
        where: {
          createdAt: { gte: windowStart },
          ...(cohortUserIds ? { studentId: { in: cohortUserIds } } : {}),
        },
      }),

      // Currently open doubts
      prisma.doubtTicket.count({
        where: {
          status: { in: ['OPEN', 'ASSIGNED'] },
          ...(cohortUserIds ? { studentId: { in: cohortUserIds } } : {}),
        },
      }),

      // Lesson progress for video completion rate
      prisma.lessonProgress.findMany({
        where: {
          updatedAt: { gte: windowStart },
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
        select: { isCompleted: true, userId: true },
      }),

      // New enrollments per day in window (for trend)
      prisma.enrollment.findMany({
        where: {
          createdAt: { gte: windowStart },
          ...(courseId ? { courseId } : {}),
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Top students by XP in window
      prisma.user.findMany({
        where: {
          role: 'STUDENT',
          xpPoints: { gt: 0 },
          ...(cohortUserIds ? { id: { in: cohortUserIds } } : {}),
        },
        orderBy: { xpPoints: 'desc' },
        take: 5,
        select: { id: true, name: true, xpPoints: true, streakCount: true },
      }),

      // Students with low activity (for "needs attention")
      prisma.enrollment.findMany({
        where: {
          status: 'ACTIVE',
          ...(courseId ? { courseId } : {}),
          ...(cohortUserIds ? { userId: { in: cohortUserIds } } : {}),
        },
        include: {
          user: { select: { id: true, name: true, totalStudyTime: true, streakCount: true } },
          course: { select: { title: true } },
        },
        take: 50,
      }),
    ]);

    // ── Compute metrics ──────────────────────────────────────────────────────

    // Video completion %: completed / total lesson progress rows
    const videoCompletionRate = lessonProgressRows.length > 0
      ? Math.round((lessonProgressRows.filter((r) => r.isCompleted).length / lessonProgressRows.length) * 100)
      : 0;

    // Drop-off: students with 0 lesson progress in window / total active
    const activeStudentIds = new Set(lessonProgressRows.map((r) => r.userId));
    const dropOffRate = activeStudents > 0
      ? Math.round(((activeStudents - activeStudentIds.size) / activeStudents) * 100)
      : 0;

    // Weekly trend: enrollments per day for each of the last `days` days
    const trendData: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const label = dayStart.toLocaleDateString('en-IN', { weekday: 'short' });
      const value = recentEnrollments.filter((e) => {
        const d = new Date(e.createdAt);
        return d >= dayStart && d <= dayEnd;
      }).length;
      trendData.push({ label, value });
    }

    // Needs attention: low study time enrollees
    const needsAttention = allEnrollments
      .filter((e) => e.user.totalStudyTime < 1800) // < 30 min
      .slice(0, 5)
      .map((e) => ({
        id: e.user.id,
        name: e.user.name ?? 'Unknown',
        detail: e.user.totalStudyTime === 0
          ? 'No study activity recorded'
          : `${Math.round(e.user.totalStudyTime / 60)} min total study time`,
        streakCount: e.user.streakCount,
      }));

    return apiSuccess({
      metrics: {
        activeStudents,
        doubtsResolved,
        totalDoubts,
        openDoubts,
        videoCompletionRate,
        dropOffRate,
      },
      trendData,
      topStudents: topStudents.map((s) => ({
        id: s.id,
        name: s.name ?? 'Unknown',
        detail: `${s.xpPoints.toLocaleString()} XP · ${s.streakCount}🔥 streak`,
      })),
      needsAttention,
    });
  } catch (err) {
    console.error('[GET_TEACHER_ANALYTICS_ERROR]', err);
    return apiServerError();
  }
}
