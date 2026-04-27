import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ assignmentId: string }> };

/**
 * GET /api/assignments/[assignmentId]/submissions
 * MENTOR/ADMIN only: list all submissions for an assignment with student details.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN']);
    if (!user) return apiForbidden('Only mentors can view all submissions');

    const { assignmentId } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { title: true, slug: true } },
        submissions: {
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!assignment) return apiNotFound('Assignment');

    return apiSuccess(assignment);
  } catch (err) {
    console.error('[GET_SUBMISSIONS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/assignments/[assignmentId]/submissions
 * MENTOR/ADMIN only: grade a specific submission.
 * Body: { submissionId: string, score: number }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN']);
    if (!user) return apiForbidden('Only mentors can grade submissions');

    const { assignmentId } = await params;
    const body = await req.json();
    const { submissionId, score, feedback } = body as { submissionId?: string; score?: number, feedback?: string };

    if (!submissionId || score === undefined) {
      return apiError('submissionId and score are required', 400);
    }
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return apiError('Score must be a number between 0 and 100', 400);
    }

    // Ensure the submission belongs to this assignment
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) return apiNotFound('Assignment');

    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, assignmentId },
    });
    if (!submission) return apiNotFound('Submission');

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score,
        feedback: feedback ?? null,
        gradedAt: new Date(),
      },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify student about the grade
    await prisma.notification.create({
      data: {
        userId: updated.studentId,
        title: 'Assignment Graded',
        body: `Your submission for "${assignment.title}" has been graded: ${score}/100.${feedback ? ' Feedback provided.' : ''}`,
        type: 'SUCCESS',
        actionUrl: `/dashboard/assignments`,
      },
    });

    return apiSuccess(updated, 'Submission graded successfully');
  } catch (err) {
    console.error('[GRADE_SUBMISSION_ERROR]', err);
    return apiServerError();
  }
}
