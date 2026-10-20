import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canManageCourse } from '@/lib/course-access';
import { buildTestReports } from '@/lib/question-stats';
import { apiForbidden, apiServerError, apiSuccess } from '@/lib/api-response';

/**
 * GET /api/teacher/question-stats/[courseId]
 *
 * Question analysis for every test in the course that students have taken:
 * how hard each question was, whether it separates strong and weak students,
 * which answers were picked, and flags for questions that look wrong. The
 * numbers are computed nightly by services/question-analytics (Python), so
 * this route only reads the QuestionStat table.
 *
 * Teachers see the courses they teach; admins see every course.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Teacher access required');

    const { courseId } = await params;
    if (!(await canManageCourse(user, courseId))) return apiForbidden('You do not teach this course');

    const tests = await prisma.courseTest.findMany({
      where: { courseId, questionStats: { some: {} } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        questions: {
          orderBy: [{ order: 'asc' }, { id: 'asc' }],
          select: { id: true, prompt: true, type: true, imageUrl: true },
        },
        questionStats: {
          select: {
            questionId: true,
            studentCount: true,
            answeredCount: true,
            correctCount: true,
            pendingCount: true,
            difficulty: true,
            discrimination: true,
            answerCounts: true,
            flags: true,
            computedAt: true,
          },
        },
      },
    });

    return apiSuccess({ tests: buildTestReports(tests) });
  } catch (err) {
    console.error('[QUESTION_STATS_ERROR]', err);
    return apiServerError();
  }
}
