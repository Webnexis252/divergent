import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { syncPerfectAttendanceXp, PERFECT_ATTENDANCE_STREAK_XP } from '@/lib/xp';

import { apiSuccess, apiCreated, apiError, apiUnauthorized, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ classId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized('Authentication required to mark attendance');

    const { classId } = await params;
    const body = await req.json();
    
    // allow status to be JOIN, LEAVE, or LEAVE_EARLY
    const status = body.status as string;
    
    if (status === 'JOIN') {
      await prisma.liveClass.findUnique({ where: { id: classId } });
      const attendance = await prisma.attendance.upsert({
        where: { userId_liveClassId: { userId: user.userId, liveClassId: classId } },
        create: {
          userId: user.userId,
          liveClassId: classId,
          joinedAt: new Date(),
          isCounted: false, // Will be marked true when teacher ends class
        },
        update: {
          // If they rejoin, clear leaveAt
          leaveAt: null,
        },
      });
      return apiCreated(attendance, 'Attendance marked');
    } else if (status === 'LEAVE') {
      const result = await prisma.$transaction(async (tx) => {
        const liveClass = await tx.liveClass.findUnique({ where: { id: classId } });
        const attendance = await tx.attendance.update({
          where: { userId_liveClassId: { userId: user.userId, liveClassId: classId } },
          data: {
            leaveAt: new Date(),
            isCounted: liveClass?.isEnded ? true : false,
          },
        });

        const xpReward = attendance.isCounted
          ? await syncPerfectAttendanceXp(user.userId, tx)
          : { awarded: false, xpAwarded: 0 };

        return { attendance, xpReward };
      });

      return apiSuccess(
        {
          ...result.attendance,
          xpAwarded: result.xpReward.xpAwarded,
        },
        result.xpReward.xpAwarded > 0
          ? `Left class marked. ${PERFECT_ATTENDANCE_STREAK_XP} XP awarded for your 7-day perfect attendance streak.`
          : 'Left class marked',
      );
    }
    
    return apiError('Invalid status', 400);
  } catch (err) {
    console.error('[MARK_ATTENDANCE_ERROR]', err);
    return apiServerError();
  }
}
