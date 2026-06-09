import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { syncPerfectAttendanceXp, PERFECT_ATTENDANCE_STREAK_XP } from '@/lib/xp';
import {
  getLiveClassWatchTimeDeltaSeconds,
  qualifiesForLiveClassAttendance,
} from '@/lib/live-class-attendance';

import { apiSuccess, apiCreated, apiError, apiUnauthorized, apiServerError } from '@/lib/api-response';

type Params = { params: Promise<{ classId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized('Authentication required to mark attendance');

    const { classId } = await params;
    const body = await req.json();

    const status = body.status as string;

    if (status === 'JOIN') {
      const liveClass = await prisma.liveClass.findUnique({
        where: { id: classId },
        select: { id: true, isEnded: true },
      });

      if (!liveClass) {
        return apiError('Live class not found', 404);
      }

      if (liveClass.isEnded) {
        return apiError('This live class has already ended', 400);
      }

      const now = new Date();
      const existingAttendance = await prisma.attendance.findUnique({
        where: {
          userId_liveClassId: { userId: user.userId, liveClassId: classId },
        },
      });

      if (existingAttendance?.leaveAt === null) {
        return apiSuccess(existingAttendance, 'Attendance tracking is already active');
      }

      if (existingAttendance) {
        const attendance = await prisma.attendance.update({
          where: {
            userId_liveClassId: { userId: user.userId, liveClassId: classId },
          },
          data: {
            joinedAt: now,
            leaveAt: null,
          },
        });

        return apiSuccess(attendance, 'Attendance tracking resumed');
      }

      const attendance = await prisma.attendance.create({
        data: {
          userId: user.userId,
          liveClassId: classId,
          joinedAt: now,
          leaveAt: null,
          watchTimeSecs: 0,
          isCounted: false,
        },
      });

      return apiCreated(attendance, 'Attendance tracking started');
    }

    if (status === 'LEAVE' || status === 'UPDATE') {
      const result = await prisma.$transaction(async (tx) => {
        const attendance = await tx.attendance.findUnique({
          where: {
            userId_liveClassId: { userId: user.userId, liveClassId: classId },
          },
        });

        if (!attendance) {
          return {
            attendance: null,
            watchTimeAddedSecs: 0,
            xpReward: { awarded: false, xpAwarded: 0 },
          };
        }

        if (attendance.leaveAt && status === 'LEAVE') {
          return {
            attendance,
            watchTimeAddedSecs: 0,
            xpReward: { awarded: false, xpAwarded: 0 },
          };
        }

        const now = new Date();
        const watchTimeAddedSecs = getLiveClassWatchTimeDeltaSeconds(
          attendance.joinedAt,
          now,
        );
        const totalWatchTimeSecs = attendance.watchTimeSecs + watchTimeAddedSecs;
        const nextIsCounted = qualifiesForLiveClassAttendance(totalWatchTimeSecs);

        const updatedAttendance = await tx.attendance.update({
          where: {
            userId_liveClassId: { userId: user.userId, liveClassId: classId },
          },
          data: {
            leaveAt: status === 'LEAVE' ? now : null,
            joinedAt: status === 'UPDATE' ? now : attendance.joinedAt,
            watchTimeSecs: totalWatchTimeSecs,
            isCounted: nextIsCounted,
          },
        });

        if (watchTimeAddedSecs > 0) {
          await tx.user.update({
            where: { id: user.userId },
            data: {
              totalStudyTime: { increment: watchTimeAddedSecs },
            },
          });
        }

        const xpReward =
          !attendance.isCounted && nextIsCounted
            ? await syncPerfectAttendanceXp(user.userId, tx)
            : { awarded: false, xpAwarded: 0 };

        return {
          attendance: updatedAttendance,
          watchTimeAddedSecs,
          xpReward,
        };
      });

      if (!result.attendance) {
        return apiError('Attendance record not found', 404);
      }

      return apiSuccess(
        {
          ...result.attendance,
          watchTimeAddedSecs: result.watchTimeAddedSecs,
          xpAwarded: result.xpReward.xpAwarded,
        },
        result.xpReward.xpAwarded > 0
          ? `Attendance counted. ${PERFECT_ATTENDANCE_STREAK_XP} XP awarded for your 7-day perfect attendance streak.`
          : result.attendance.isCounted
            ? 'Attendance counted'
            : 'Watch time saved.',
      );
    }

    return apiError('Invalid status', 400);
  } catch (err) {
    console.error('[MARK_ATTENDANCE_ERROR]', err);
    return apiServerError();
  }
}
