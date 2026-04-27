import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/teacher/tests/[testId]/analytics
 * Teacher/Admin: Get detailed analytics for a course test.
 * Includes: score distribution, question-level difficulty, pass rate, avg time.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only teachers/admins can view analytics');

    const test = await prisma.courseTest.findUnique({
      where: { id: testId },
      include: {
        questions: { orderBy: { order: 'asc' } },
        attempts: {
          where: { submittedAt: { not: null } },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        course: { select: { id: true, title: true } },
        chapter: { select: { id: true, title: true } },
      },
    });
    if (!test) return apiNotFound('Test');

    const completedAttempts = test.attempts;
    const totalAttempts = completedAttempts.length;

    if (totalAttempts === 0) {
      return apiSuccess({
        test: { id: test.id, title: test.title, course: test.course, chapter: test.chapter },
        totalAttempts: 0,
        message: 'No attempts yet.',
      });
    }

    // Score distribution (buckets: 0-10, 11-20, ..., 91-100)
    const scoreBuckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10 + 1}-${(i + 1) * 10}`,
      count: 0,
    }));
    scoreBuckets[0].range = '0-10'; // Fix first bucket

    let totalScore = 0;
    let passCount = 0;
    let totalTimeSpent = 0;

    for (const attempt of completedAttempts) {
      totalScore += attempt.score;
      if (attempt.isPassed) passCount++;
      if (attempt.timeSpentSecs) totalTimeSpent += attempt.timeSpentSecs;

      const bucketIndex = Math.min(Math.floor(attempt.score / 10), 9);
      scoreBuckets[bucketIndex].count++;
    }

    // Question-level analysis: how often each question is answered correctly
    const questionAnalysis = test.questions.map((q) => {
      let correctCount = 0;
      let attemptedCount = 0;

      for (const attempt of completedAttempts) {
        const answers = attempt.answers as Record<string, unknown>;
        if (answers[q.id] !== undefined) {
          attemptedCount++;
          const isCorrect =
            String(answers[q.id]).toLowerCase().trim() ===
            String(q.correctAnswer).toLowerCase().trim();
          if (isCorrect) correctCount++;
        }
      }

      return {
        id: q.id,
        prompt: q.prompt.length > 80 ? q.prompt.slice(0, 80) + '...' : q.prompt,
        type: q.type,
        difficulty: q.difficulty,
        points: q.points,
        attemptedCount,
        correctCount,
        correctRate: attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0,
      };
    });

    // Top/bottom performers
    const uniqueUsers = new Map<string, { name: string | null; email: string | null; bestScore: number }>();
    for (const attempt of completedAttempts) {
      const existing = uniqueUsers.get(attempt.userId);
      if (!existing || attempt.score > existing.bestScore) {
        uniqueUsers.set(attempt.userId, {
          name: attempt.user.name,
          email: attempt.user.email,
          bestScore: attempt.score,
        });
      }
    }
    const leaderboard = Array.from(uniqueUsers.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 10);

    return apiSuccess({
      test: {
        id: test.id,
        title: test.title,
        course: test.course,
        chapter: test.chapter,
        passingScore: test.passingScore,
        durationMins: test.durationMins,
        totalQuestions: test.questions.length,
      },
      overview: {
        totalAttempts,
        uniqueStudents: uniqueUsers.size,
        passCount,
        failCount: totalAttempts - passCount,
        passRate: Math.round((passCount / totalAttempts) * 100),
        avgScore: Math.round(totalScore / totalAttempts),
        avgTimeSpentSecs: Math.round(totalTimeSpent / totalAttempts),
        highestScore: Math.max(...completedAttempts.map((a) => a.score)),
        lowestScore: Math.min(...completedAttempts.map((a) => a.score)),
      },
      scoreBuckets,
      questionAnalysis,
      leaderboard,
    });
  } catch (err) {
    console.error('[TEST_ANALYTICS_ERROR]', err);
    return apiServerError();
  }
}
