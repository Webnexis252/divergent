import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';
import {
  countActiveStudents,
  countEnrollmentsByDay,
  rankStudentPerformance,
  summarizeDoubtResponseTimes,
  summarizeLessonProgress,
} from '@/lib/teacher-analytics';

/**
 * GET /api/teacher/analytics
 * Returns aggregated class analytics for MENTOR/ADMIN users.
 * Supports optional ?courseId=, ?cohortId= and ?days= query params.
 * Every aggregate runs in SQL (see src/lib/teacher-analytics.ts), so the cost
 * of this route doesn't grow with the number of students.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only mentors and admins can access analytics');

    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '7', 10) || 7, 1), 365);
    const courseId = searchParams.get('courseId') ?? undefined;
    const cohortId = searchParams.get('cohortId') ?? undefined;
    const scope = { courseId, cohortId };

    const now = new Date();
    const windowStart = new Date(now.getTime() - days * DAY_MS);
    // A relation filter rather than an `IN (...)` list of every cohort member's id
    const cohortStudents = cohortId ? { student: { cohortStudents: { some: { cohortId } } } } : {};

    const [
      activeStudents,
      doubtsResolved,
      totalDoubts,
      openDoubts,
      lessonProgress,
      enrollmentsByDay,
      performance,
      doubtResponse,
    ] = await Promise.all([
      countActiveStudents(scope),

      // Doubts resolved in window
      prisma.doubtTicket.count({
        where: {
          status: { in: ['RESOLVED', 'CLOSED'] },
          updatedAt: { gte: windowStart },
          ...cohortStudents,
        },
      }),

      // Total doubts in window
      prisma.doubtTicket.count({
        where: {
          createdAt: { gte: windowStart },
          ...cohortStudents,
        },
      }),

      // Currently open doubts
      prisma.doubtTicket.count({
        where: {
          status: { in: ['OPEN', 'ASSIGNED'] },
          ...cohortStudents,
        },
      }),

      summarizeLessonProgress(windowStart, scope),
      countEnrollmentsByDay(windowStart, scope),
      rankStudentPerformance(now, scope),
      summarizeDoubtResponseTimes(windowStart, scope),
    ]);

    // Video completion %: completed / total lesson progress rows
    const videoCompletionRate = lessonProgress.total > 0
      ? Math.round((lessonProgress.completed / lessonProgress.total) * 100)
      : 0;

    // Drop-off: students with no lesson progress in window / total active
    const dropOffRate = activeStudents > 0
      ? Math.round(((activeStudents - lessonProgress.learners) / activeStudents) * 100)
      : 0;

    // Enrollments per UTC day for each of the last `days` days
    const trendData: { label: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * DAY_MS);
      const key = day.toISOString().slice(0, 10);
      const label = day.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' });
      trendData.push({ label, value: enrollmentsByDay.get(key) ?? 0 });
    }

    return apiSuccess({
      metrics: {
        activeStudents,
        doubtsResolved,
        totalDoubts,
        openDoubts,
        videoCompletionRate,
        dropOffRate,
      },
      doubtResponse,
      trendData,
      topStudents: performance.topStudents,
      needsAttention: performance.needsAttention,
      needsAttentionCount: performance.needsAttentionCount,
    });
  } catch (err) {
    console.error('[GET_TEACHER_ANALYTICS_ERROR]', err);
    return apiServerError();
  }
}
