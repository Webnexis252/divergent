import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { AssignMentorSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiError,
  apiForbidden,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ doubtId: string }> };

/**
 * GET /api/doubts/[doubtId]
 * Fetch a single doubt with all replies. Auth required.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { doubtId } = await params;
    const doubt = await prisma.doubtTicket.findUnique({
      where: { id: doubtId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        mentor: { select: { id: true, name: true } },
        replies: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!doubt) return apiNotFound('Doubt');

    // Students can only view their own doubts
    if (user.role === 'STUDENT' && doubt.studentId !== user.userId) {
      return apiForbidden();
    }

    return apiSuccess(doubt);
  } catch (err) {
    console.error('[GET_DOUBT_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/doubts/[doubtId]/reply
 * Mentors and students can post replies.
 * Use sub-route pattern: this route handles actions via query param ?action=
 */

/**
 * PATCH /api/doubts/[doubtId]
 * Admin: assign mentor  |  Mentor/Admin: update status
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins and mentors can update doubts');

    const { doubtId } = await params;
    const body = await req.json();

    // Assign mentor (admin only)
    if (body.mentorId !== undefined) {
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return apiForbidden('Only admins can assign mentors');
      const parsed = AssignMentorSchema.safeParse(body);
      if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

      const updated = await prisma.doubtTicket.update({
        where: { id: doubtId },
        data: { mentorId: parsed.data.mentorId, status: 'ASSIGNED' },
      });
      return apiSuccess(updated, 'Mentor assigned successfully');
    }

    // Update status (mentor or admin)
    if (body.status !== undefined) {
      const updated = await prisma.doubtTicket.update({
        where: { id: doubtId },
        data: { status: body.status },
      });
      return apiSuccess(updated, 'Doubt status updated');
    }

    return apiError('No valid update fields provided');
  } catch (err) {
    console.error('[UPDATE_DOUBT_ERROR]', err);
    return apiServerError();
  }
}
