import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { NextRequest } from 'next/server';

/**
 * GET /api/teacher/analytics/[courseId]
 * Returns cohort analytics: completion rates, and at-risk students.
 * At-risk = enrolled students who haven't logged in for 7+ days OR have <30% quiz pass rate.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const auth = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Teacher access required');

    const { courseId } = await params;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            updatedAt: true,
            quizAttempts: {
              select: { isPassed: true, score: true },
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
            assignmentSubmissions: {
              where: { assignment: { courseId } },
              select: { score: true, gradedAt: true, submittedAt: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const totalStudents = enrollments.length;
    const completedCount = enrollments.filter(e => e.progressPercent >= 100).length;
    const avgProgress = totalStudents > 0
      ? enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / totalStudents
      : 0;

    const students = enrollments.map((e) => {
      const quizAttempts = e.user.quizAttempts;
      const passRate = quizAttempts.length > 0
        ? (quizAttempts.filter(q => q.isPassed).length / quizAttempts.length) * 100
        : null;
      const lastActive = e.user.updatedAt;
      const isInactive = lastActive < sevenDaysAgo;
      const hasLowQuizScore = passRate !== null && passRate < 40;
      const submissions = e.user.assignmentSubmissions;
      const submittedCount = submissions.filter(s => s.submittedAt).length;

      return {
        id: e.user.id,
        name: e.user.name,
        email: e.user.email,
        image: e.user.image,
        progress: e.progressPercent,
        lastActive,
        passRate,
        submittedCount,
        isAtRisk: isInactive || hasLowQuizScore,
        riskReasons: [
          ...(isInactive ? ['Inactive 7+ days'] : []),
          ...(hasLowQuizScore ? [`Low quiz pass rate (${Math.round(passRate!)}%)`] : []),
        ],
      };
    });

    const atRiskStudents = students.filter(s => s.isAtRisk);

    return apiSuccess({
      totalStudents,
      completedCount,
      avgProgress: Math.round(avgProgress),
      atRiskCount: atRiskStudents.length,
      students,
      atRiskStudents,
    });
  } catch (err) {
    console.error('[TEACHER_ANALYTICS_ERROR]', err);
    return apiServerError();
  }
}
