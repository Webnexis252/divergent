import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';
import { syncPerfectAttendanceXp } from '@/lib/xp';
import {
  getLiveClassWatchTimeDeltaSeconds,
  qualifiesForLiveClassAttendance,
} from '@/lib/live-class-attendance';

type Params = { params: Promise<{ classId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return apiUnauthorized('Teacher access required');
    }

    const { classId } = await params;

    const liveClass = await prisma.$transaction(async (tx) => {
      const endedAt = new Date();
      const updatedLiveClass = await tx.liveClass.update({
        where: { id: classId },
        data: {
          isEnded: true,
          endedAt,
        },
      });

      const activeAttendances = await tx.attendance.findMany({
        where: {
          liveClassId: classId,
          leaveAt: null,
        },
        select: {
          id: true,
          userId: true,
          joinedAt: true,
          watchTimeSecs: true,
          isCounted: true,
        },
      });

      const newlyCountedStudentIds = new Set<string>();

      for (const attendance of activeAttendances) {
        const watchTimeAddedSecs = getLiveClassWatchTimeDeltaSeconds(
          attendance.joinedAt,
          endedAt,
        );
        const totalWatchTimeSecs = attendance.watchTimeSecs + watchTimeAddedSecs;
        const nextIsCounted = qualifiesForLiveClassAttendance(totalWatchTimeSecs);

        await tx.attendance.update({
          where: { id: attendance.id },
          data: {
            leaveAt: endedAt,
            watchTimeSecs: totalWatchTimeSecs,
            isCounted: nextIsCounted,
          },
        });

        if (watchTimeAddedSecs > 0) {
          await tx.user.update({
            where: { id: attendance.userId },
            data: {
              totalStudyTime: { increment: watchTimeAddedSecs },
            },
          });
        }

        if (!attendance.isCounted && nextIsCounted) {
          newlyCountedStudentIds.add(attendance.userId);
        }
      }

      for (const studentId of newlyCountedStudentIds) {
        await syncPerfectAttendanceXp(studentId, tx);
      }

      return updatedLiveClass;
    });

    return apiSuccess(liveClass, 'Class ended successfully');
  } catch (err) {
    console.error('[END_CLASS_ERROR]', err);
    return apiServerError();
  }
}
