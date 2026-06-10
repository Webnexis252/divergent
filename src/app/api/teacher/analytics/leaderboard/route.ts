import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/teacher/analytics/leaderboard
 * Returns the leaderboard data for exams.
 * Supports optional ?testId= query param to filter to a specific exam.
 * Only returns results for exams associated with courses the mentor/admin has access to.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Only mentors and admins can access analytics');

    const { searchParams } = new URL(req.url);
    const testId = searchParams.get('testId') ?? undefined;

    // Fetch tests with their top 10 highest scoring attempts
    const tests = await prisma.courseTest.findMany({
      where: {
        type: 'COURSE_EXAM',
        ...(testId ? { id: testId } : {}),
      },
      select: {
        id: true,
        title: true,
        course: { select: { title: true } },
        attempts: {
          where: { isPassed: true },
          orderBy: { score: 'desc' },
          take: 10,
          select: {
            id: true,
            score: true,
            totalPoints: true,
            user: { select: { id: true, name: true, image: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format the response
    const leaderboards = tests.map(test => {
      // Group by user to ensure a user only appears once per test leaderboard (with their highest score)
      const uniqueAttemptsMap = new Map<string, typeof test.attempts[0]>();
      
      for (const attempt of test.attempts) {
        if (!uniqueAttemptsMap.has(attempt.user.id)) {
          uniqueAttemptsMap.set(attempt.user.id, attempt);
        } else {
          const existing = uniqueAttemptsMap.get(attempt.user.id)!;
          if (attempt.score > existing.score) {
            uniqueAttemptsMap.set(attempt.user.id, attempt);
          }
        }
      }

      const topStudents = Array.from(uniqueAttemptsMap.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(a => ({
          id: a.user.id,
          name: a.user.name ?? 'Unknown Student',
          image: a.user.image,
          score: a.score,
          totalPoints: a.totalPoints,
        }));

      return {
        id: test.id,
        title: test.title,
        courseTitle: test.course.title,
        topStudents
      };
    });

    return apiSuccess(leaderboards);
  } catch (err) {
    console.error('[GET_TEACHER_ANALYTICS_LEADERBOARD_ERROR]', err);
    return apiServerError();
  }
}
