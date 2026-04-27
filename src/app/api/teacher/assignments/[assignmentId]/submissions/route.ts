import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ assignmentId: string }> };

/**
 * GET /api/teacher/assignments/[assignmentId]/submissions
 * Returns all student submissions for the given assignment.
 * Scoped so a MENTOR can only see submissions for assignments in their own courses.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Teacher access required');

    const { assignmentId } = await params;

    // Fetch the assignment with course info
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { id: true, title: true, teachers: { select: { id: true } } } },
      },
    });

    if (!assignment) return apiNotFound('Assignment');

    // Mentors can only see submissions for their own courses
    if (
      user.role === 'MENTOR' &&
      !assignment.course?.teachers.some((t) => t.id === user.userId)
    ) {
      return apiForbidden('You can only view submissions for your own courses');
    }

    // Fetch all submissions with student details
    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return apiSuccess({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        points: assignment.points,
        deadline: assignment.deadline?.toISOString() ?? null,
        courseTitle: assignment.course?.title ?? 'Unknown Course',
      },
      submissions: submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        studentName: s.student?.name ?? 'Unknown Student',
        studentEmail: s.student?.email ?? '',
        content: s.content,
        fileUrl: s.fileUrl,
        score: s.score,
        feedback: s.feedback,
        submittedAt: s.submittedAt.toISOString(),
        gradedAt: s.gradedAt?.toISOString() ?? null,
      })),
    });
  } catch (err) {
    console.error('[GET_ASSIGNMENT_SUBMISSIONS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/teacher/assignments/[assignmentId]/submissions
 * Grade a submission: { submissionId, score, feedback }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Teacher access required');

    const { assignmentId } = await params;
    const body = await req.json() as { submissionId: string; score?: number; feedback?: string };

    // Verify ownership
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: { select: { teachers: { select: { id: true } } } } },
    });

    if (!assignment) return apiNotFound('Assignment');
    if (user.role === 'MENTOR' && !assignment.course?.teachers.some(t => t.id === user.userId)) {
      return apiForbidden('You do not have access to submissions for this course');
    }

    const updated = await prisma.assignmentSubmission.update({
      where: { id: body.submissionId },
      data: {
        score: body.score ?? undefined,
        feedback: body.feedback ?? undefined,
        gradedAt: new Date(),
      },
    });

    return apiSuccess(updated, 'Submission graded successfully');
  } catch (err) {
    console.error('[GRADE_SUBMISSION_ERROR]', err);
    return apiServerError();
  }
}
