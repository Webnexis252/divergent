import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ReplyDoubtSchema } from '@/lib/validators';
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ doubtId: string }> };

/**
 * POST /api/doubts/[doubtId]/replies
 * Mentors, Admins, or the doubt's own student can post replies.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { doubtId } = await params;
    const doubt = await prisma.doubtTicket.findUnique({ where: { id: doubtId } });
    if (!doubt) return apiNotFound('Doubt');

    // Only the student who raised it, their assigned mentor, or an admin can reply
    const isOwner = user.userId === doubt.studentId;
    const isAssignedMentor = user.userId === doubt.mentorId;
    const isUnassignedMentor = doubt.mentorId === null && user.role === "MENTOR";
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

    if (!isOwner && !isAssignedMentor && !isAdmin && !isUnassignedMentor) {
      return apiForbidden("You do not have permission to reply to this doubt");
    }

    const body = await req.json();
    const parsed = ReplyDoubtSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const reply = await prisma.doubtReply.create({
      data: {
        doubtTicketId: doubtId,
        authorId: user.userId,
        body: parsed.data.body,
        attachmentUrl: parsed.data.attachmentUrl,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    // Auto-update doubt status to RESOLVED if mentor or admin replies
    if (isAssignedMentor || isAdmin || isUnassignedMentor) {
      await prisma.doubtTicket.update({
        where: { id: doubtId },
        data: { 
          status: "RESOLVED",
          ...(isUnassignedMentor ? { mentorId: user.userId } : {})
        },
      });
    }

    return apiCreated(reply, "Reply posted successfully");
  } catch (err) {
    console.error('[REPLY_DOUBT_ERROR]', err);
    return apiServerError();
  }
}
