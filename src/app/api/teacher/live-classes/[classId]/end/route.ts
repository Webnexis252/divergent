import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';
import { syncPerfectAttendanceXp } from '@/lib/xp';

type Params = { params: Promise<{ classId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user || (user.role !== 'MENTOR' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      return apiUnauthorized('Teacher access required');
    }

    const { classId } = await params;

    const liveClass = await prisma.$transaction(async (tx) => {
      const updatedLiveClass = await tx.liveClass.update({
        where: { id: classId },
        data: {
          isEnded: true,
          endedAt: new Date(),
        },
      });

      const countedAttendances = await tx.attendance.findMany({
        where: {
          liveClassId: classId,
          leaveAt: null,
        },
        select: {
          userId: true,
        },
      });

      await tx.attendance.updateMany({
        where: {
          liveClassId: classId,
          leaveAt: null,
        },
        data: {
          isCounted: true,
        },
      });

      const affectedStudentIds = Array.from(
        new Set(countedAttendances.map((attendance) => attendance.userId)),
      );

      for (const studentId of affectedStudentIds) {
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
