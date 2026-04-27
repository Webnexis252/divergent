import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiCreated,
  apiError,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';
import { ASSIGNMENT_SUBMISSION_XP } from '@/lib/xp';

type Params = { params: Promise<{ assignmentId: string }> };

/**
 * POST /api/assignments/[assignmentId]/submit
 * Students only: submit an assignment (text content + optional file URL).
 * Creates a new AssignmentSubmission record.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can submit assignments');

    const { assignmentId } = await params;

    // Ensure the assignment exists and is active
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) return apiNotFound('Assignment');
    if (assignment.status !== 'ACTIVE') {
      return apiError('This assignment is not accepting submissions', 400);
    }

    const body = await req.json();
    const { content, fileUrl } = body as { content?: string; fileUrl?: string };

    if (!content && !fileUrl) {
      return apiError('Please provide either a text response or a file URL', 400);
    }

    const submissionResult = await prisma.$transaction(async (tx) => {
      const created = await tx.assignmentSubmission.createMany({
        data: [
          {
            assignmentId,
            studentId: user.userId,
            content: content ?? null,
            fileUrl: fileUrl ?? null,
          },
        ],
        skipDuplicates: true,
      });

      if (created.count > 0) {
        await tx.user.updateMany({
          where: {
            id: user.userId,
            role: 'STUDENT',
          },
          data: {
            xpPoints: { increment: ASSIGNMENT_SUBMISSION_XP },
          },
        });

        const createdSubmission = await tx.assignmentSubmission.findUnique({
          where: {
            assignmentId_studentId: {
              assignmentId,
              studentId: user.userId,
            },
          },
        });

        if (!createdSubmission) {
          throw new Error('Submission was created but could not be reloaded.');
        }

        return {
          submission: createdSubmission,
          wasFirstSubmission: true,
          xpAwarded: ASSIGNMENT_SUBMISSION_XP,
        };
      }

      const updatedSubmission = await tx.assignmentSubmission.update({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId: user.userId,
          },
        },
        data: {
          content: content ?? null,
          fileUrl: fileUrl ?? null,
          submittedAt: new Date(),
          score: null,
          gradedAt: null,
        },
      });

      return {
        submission: updatedSubmission,
        wasFirstSubmission: false,
        xpAwarded: 0,
      };
    });

    return apiCreated(
      {
        ...submissionResult.submission,
        wasFirstSubmission: submissionResult.wasFirstSubmission,
        xpAwarded: submissionResult.xpAwarded,
      },
      submissionResult.wasFirstSubmission
        ? `Assignment submitted successfully. ${ASSIGNMENT_SUBMISSION_XP} XP awarded.`
        : 'Assignment resubmitted successfully',
    );
  } catch (err) {
    console.error('[SUBMIT_ASSIGNMENT_ERROR]', err);
    return apiServerError();
  }
}

/**
 * GET /api/assignments/[assignmentId]/submit
 * Returns the current student's submission status for this assignment.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { assignmentId } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        course: { select: { title: true } },
        submissions: user.role === 'STUDENT'
          ? { where: { studentId: user.userId } }
          : { include: { student: { select: { id: true, name: true, email: true } } } },
      },
    });

    if (!assignment) return apiNotFound('Assignment');

    // Students see their own submission; mentors/admins see all
    return apiCreated(assignment, 'OK');
  } catch (err) {
    console.error('[GET_ASSIGNMENT_SUBMISSION_ERROR]', err);
    return apiServerError();
  }
}
