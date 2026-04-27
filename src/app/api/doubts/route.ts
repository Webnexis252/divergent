import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateDoubtSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';
import { DOUBT_SUBMISSION_XP_COST, spendStudentXp } from '@/lib/xp';

/**
 * GET /api/doubts
 * - Students: their own doubts
 * - Mentors: doubts assigned to them
 * - Admins: all doubts
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    let doubts;

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      doubts = await prisma.doubtTicket.findMany({
        include: {
          student: { select: { id: true, name: true, email: true } },
          mentor: { select: { id: true, name: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'MENTOR') {
      doubts = await prisma.doubtTicket.findMany({
        where: {
          OR: [
            { mentorId: user.userId },
            { mentorId: null },
          ]
        },
        include: {
          student: { select: { id: true, name: true, email: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Student: only their own doubts
      doubts = await prisma.doubtTicket.findMany({
        where: { studentId: user.userId },
        include: {
          mentor: { select: { id: true, name: true } },
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return apiSuccess(doubts);
  } catch (err) {
    console.error('[GET_DOUBTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/doubts
 * Students only: Submit a new doubt ticket.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['STUDENT']);
    if (!user) return apiUnauthorized('Only students can submit doubts');

    const body = await req.json();
    const parsed = CreateDoubtSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const doubt = await prisma.$transaction(async (tx) => {
      const spent = await spendStudentXp(user.userId, DOUBT_SUBMISSION_XP_COST, tx);
      if (!spent) return null;

      return tx.doubtTicket.create({
        data: {
          studentId: user.userId,
          ...parsed.data,
        },
      });
    });

    if (!doubt) {
      return apiError(
        `You need at least ${DOUBT_SUBMISSION_XP_COST} XP to submit a doubt.`,
        403,
      );
    }

    // === Auto-Dispatch Algorithm ===
    // Find the best available mentor based on:
    // 1. Subject keyword match in MentorSkill labels
    // 2. Lowest count of currently OPEN or ASSIGNED tickets (workload)
    try {
      const subjectKeywords = parsed.data.subject.toLowerCase().split(' ');

      // Get all active mentors
      const mentors = await prisma.user.findMany({
        where: { role: 'MENTOR' },
        select: {
          id: true,
          mentorSkills: { select: { label: true } },
          managedDoubts: {
            where: { status: { in: ['OPEN', 'ASSIGNED'] } },
            select: { id: true },
          },
        },
      });

      if (mentors.length > 0) {
        // Score each mentor: +2 for skill match, -1 for each active ticket
        const scored = mentors.map((m) => {
          const skillMatch = m.mentorSkills.some((s) =>
            subjectKeywords.some((kw) => s.label.toLowerCase().includes(kw))
          );
          const workload = m.managedDoubts.length;
          const score = (skillMatch ? 2 : 0) - workload;
          return { id: m.id, score };
        });

        const best = scored.sort((a, b) => b.score - a.score)[0];
        if (best) {
          await prisma.doubtTicket.update({
            where: { id: doubt.id },
            data: { mentorId: best.id, status: 'ASSIGNED' },
          });
        }
      }
    } catch (dispatchErr) {
      // Non-critical: auto-dispatch failure should not block the student
      console.warn('[AUTO_DISPATCH_WARN]', dispatchErr);
    }
    // === End Auto-Dispatch ===

    return apiCreated(doubt, 'Doubt submitted successfully');
  } catch (err) {
    console.error('[CREATE_DOUBT_ERROR]', err);
    return apiServerError();
  }
}
