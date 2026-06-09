import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * GET /api/users/me/assignments
 * Returns all assignments for courses the student is enrolled in,
 * bucketed into: upcoming (near deadline), pending (active), completed (submitted).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const now = new Date();
    const soon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 48 hours from now

    // Get course IDs the student is enrolled in
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: auth.userId, status: 'ACTIVE' },
      select: { courseId: true },
    });
    const courseIds = enrollments.map((e) => e.courseId);

    // Students with no active enrollments get no assignments
    if (courseIds.length === 0) {
      return apiSuccess({ upcoming: [], pending: [], completed: [] });
    }

    // Get all active assignments for those courses
    const assignments = await prisma.assignment.findMany({
      where: {
        status: 'ACTIVE',
        courseId: { in: courseIds },
      },
      include: {
        course: { select: { title: true, slug: true } },
        submissions: {
          where: { studentId: auth.userId },
          select: { id: true, score: true, submittedAt: true, gradedAt: true },
        },
      },
      orderBy: [{ deadline: 'asc' }, { createdAt: 'desc' }],
    });

    const formatAssignment = (a: typeof assignments[0]) => {
      const submission = a.submissions[0] ?? null;
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        deadline: a.deadline?.toISOString() ?? null,
        points: a.points,
        attachmentUrl: a.attachmentUrl,
        courseTitle: a.course?.title ?? 'General',
        courseSlug: a.course?.slug ?? null,
        submission: submission
          ? {
              id: submission.id,
              score: submission.score,
              submittedAt: submission.submittedAt.toISOString(),
              gradedAt: submission.gradedAt?.toISOString() ?? null,
            }
          : null,
      };
    };

    // Bucket: submitted assignments (have a submission record)
    const completed = assignments
      .filter((a) => a.submissions.length > 0)
      .map(formatAssignment);

    // Bucket: not submitted, deadline within 48 hrs
    const upcoming = assignments
      .filter(
        (a) =>
          a.submissions.length === 0 &&
          a.deadline &&
          a.deadline >= now &&
          a.deadline <= soon
      )
      .map(formatAssignment);

    // Bucket: not submitted, deadline further out, no deadline, or passed deadline (late)
    const pending = assignments
      .filter(
        (a) =>
          a.submissions.length === 0 &&
          (!a.deadline || a.deadline > soon || a.deadline < now)
      )
      .map(formatAssignment);

    return apiSuccess({ upcoming, pending, completed });
  } catch (err) {
    console.error('[GET_MY_ASSIGNMENTS_ERROR]', err);
    return apiServerError();
  }
}
