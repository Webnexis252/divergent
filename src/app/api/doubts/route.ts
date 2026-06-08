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
import { DOUBT_SUBMISSION_XP_COST, DOUBT_IMAGE_XP_COST, spendStudentXp } from '@/lib/xp';

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

    const totalCost = DOUBT_SUBMISSION_XP_COST + (parsed.data.attachmentUrl ? DOUBT_IMAGE_XP_COST : 0);

    const doubt = await prisma.$transaction(async (tx) => {
      const spent = await spendStudentXp(user.userId, totalCost, tx);
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
        `You need at least ${totalCost} XP to submit this doubt.`,
        403,
      );
    }

    // === Auto-Dispatch Algorithm ===
    // 1. Check if the student is enrolled in any courses
    // 2. Extract mentors from those courses
    // 3. Pick the mentor with the lowest workload
    try {
      // Find courses the student is enrolled in, and get their assigned teachers
      const enrolledCourses = await prisma.course.findMany({
        where: {
          enrollments: {
            some: {
              userId: user.userId,
              status: 'ACTIVE',
            },
          },
        },
        select: {
          teachers: {
            where: { role: 'MENTOR' },
            select: {
              id: true,
              managedDoubts: {
                where: { status: { in: ['OPEN', 'ASSIGNED'] } },
                select: { id: true },
              },
            },
          },
        },
      });

      const uniqueMentorsMap = new Map<string, { id: string, workload: number }>();
      for (const course of enrolledCourses) {
        for (const teacher of course.teachers) {
          if (!uniqueMentorsMap.has(teacher.id)) {
            uniqueMentorsMap.set(teacher.id, {
              id: teacher.id,
              workload: teacher.managedDoubts.length,
            });
          }
        }
      }

      const availableMentors = Array.from(uniqueMentorsMap.values());

      if (availableMentors.length > 0) {
        // Sort by workload ascending (lowest workload first)
        availableMentors.sort((a, b) => a.workload - b.workload);
        const best = availableMentors[0];

        if (best) {
          await prisma.doubtTicket.update({
            where: { id: doubt.id },
            data: { mentorId: best.id, status: 'ASSIGNED' },
          });
        }
      }
      // If no mentors available from enrolled courses, it remains OPEN for admins
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
