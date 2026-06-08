import { EnrollmentStatus, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

export const COURSE_ENROLLMENT_XP = 1000;
export const DAILY_LOGIN_XP = 100;
export const ASSIGNMENT_SUBMISSION_XP = 150;
export const PERFECT_ATTENDANCE_STREAK_DAYS = 7;
export const PERFECT_ATTENDANCE_STREAK_XP = 100;
export const COMMUNITY_POST_XP_COST = 25;
export const DOUBT_SUBMISSION_XP_COST = 25;
export const DOUBT_IMAGE_XP_COST = 25;

const DAILY_XP_TIMEZONE_OFFSET_MINUTES = 330;

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

function getRewardDayStart(now: Date) {
  const offsetMs = DAILY_XP_TIMEZONE_OFFSET_MINUTES * 60 * 1000;
  const shiftedNow = new Date(now.getTime() + offsetMs);

  return new Date(
    Date.UTC(
      shiftedNow.getUTCFullYear(),
      shiftedNow.getUTCMonth(),
      shiftedNow.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - offsetMs,
  );
}

function getRewardDayKey(date: Date) {
  const offsetMs = DAILY_XP_TIMEZONE_OFFSET_MINUTES * 60 * 1000;
  const shiftedDate = new Date(date.getTime() + offsetMs);
  const year = shiftedDate.getUTCFullYear();
  const month = String(shiftedDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shiftedDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function awardDailyLoginXp(
  userId: string,
  client: PrismaClientLike = prisma,
  now = new Date(),
) {
  const rewardDayStart = getRewardDayStart(now);
  const result = await client.user.updateMany({
    where: {
      id: userId,
      role: 'STUDENT',
      OR: [
        { lastDailyLoginXpAt: null },
        { lastDailyLoginXpAt: { lt: rewardDayStart } },
      ],
    },
    data: {
      xpPoints: { increment: DAILY_LOGIN_XP },
      lastDailyLoginXpAt: now,
    },
  });

  return result.count > 0;
}

export async function spendStudentXp(
  userId: string,
  amount: number,
  client: PrismaClientLike = prisma,
) {
  const result = await client.user.updateMany({
    where: {
      id: userId,
      role: 'STUDENT',
      xpPoints: { gte: amount },
    },
    data: {
      xpPoints: { decrement: amount },
    },
  });

  return result.count > 0;
}

export async function adjustStudentXp(
  userId: string,
  delta: number,
  client: PrismaClientLike = prisma,
) {
  if (!Number.isInteger(delta) || delta === 0) {
    throw new Error('XP adjustment delta must be a non-zero integer.');
  }

  if (delta > 0) {
    const result = await client.user.updateMany({
      where: {
        id: userId,
        role: 'STUDENT',
      },
      data: {
        xpPoints: { increment: delta },
      },
    });

    if (result.count === 0) {
      return null;
    }
  } else {
    const spent = await spendStudentXp(userId, Math.abs(delta), client);
    if (!spent) {
      return null;
    }
  }

  return client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      xpPoints: true,
    },
  });
}

export async function syncPerfectAttendanceXp(
  userId: string,
  client: PrismaClientLike = prisma,
  now = new Date(),
) {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      streakCount: true,
      attendanceRewardBlocks: true,
    },
  });

  if (!user || user.role !== 'STUDENT') {
    return { awarded: false, xpAwarded: 0, streakDays: 0, rewardBlocks: 0 };
  }

  const enrollments = await client.enrollment.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    select: { courseId: true },
  });

  if (enrollments.length === 0) {
    if (user.streakCount !== 0 || user.attendanceRewardBlocks !== 0) {
      await client.user.update({
        where: { id: userId },
        data: {
          streakCount: 0,
          attendanceRewardBlocks: 0,
        },
      });
    }

    return { awarded: false, xpAwarded: 0, streakDays: 0, rewardBlocks: 0 };
  }

  const liveClasses = await client.liveClass.findMany({
    where: {
      courseId: { in: enrollments.map((enrollment) => enrollment.courseId) },
      isEnded: true,
      startTime: { lte: now },
    },
    select: {
      id: true,
      startTime: true,
    },
    orderBy: { startTime: 'desc' },
  });

  if (liveClasses.length === 0) {
    if (user.streakCount !== 0 || user.attendanceRewardBlocks !== 0) {
      await client.user.update({
        where: { id: userId },
        data: {
          streakCount: 0,
          attendanceRewardBlocks: 0,
        },
      });
    }

    return { awarded: false, xpAwarded: 0, streakDays: 0, rewardBlocks: 0 };
  }

  const attendedRecords = await client.attendance.findMany({
    where: {
      userId,
      isCounted: true,
      liveClassId: { in: liveClasses.map((liveClass) => liveClass.id) },
    },
    select: { liveClassId: true },
  });

  const attendedClassIds = new Set(
    attendedRecords.map((attendance) => attendance.liveClassId),
  );
  const classesByDay = new Map<string, string[]>();

  for (const liveClass of liveClasses) {
    const dayKey = getRewardDayKey(liveClass.startTime);
    const classIds = classesByDay.get(dayKey);

    if (classIds) {
      classIds.push(liveClass.id);
    } else {
      classesByDay.set(dayKey, [liveClass.id]);
    }
  }

  const orderedDayKeys = Array.from(classesByDay.keys()).sort().reverse();
  let streakDays = 0;

  for (const dayKey of orderedDayKeys) {
    const dayClassIds = classesByDay.get(dayKey) ?? [];
    const attendedAllClasses = dayClassIds.every((classId) =>
      attendedClassIds.has(classId),
    );

    if (!attendedAllClasses) {
      break;
    }

    streakDays += 1;
  }

  const rewardBlocks = Math.floor(
    streakDays / PERFECT_ATTENDANCE_STREAK_DAYS,
  );
  const rewardBlockDelta = rewardBlocks - user.attendanceRewardBlocks;

  if (rewardBlockDelta > 0) {
    const xpAwarded = rewardBlockDelta * PERFECT_ATTENDANCE_STREAK_XP;
    const rewarded = await client.user.updateMany({
      where: {
        id: userId,
        role: 'STUDENT',
        attendanceRewardBlocks: { lt: rewardBlocks },
      },
      data: {
        streakCount: streakDays,
        attendanceRewardBlocks: rewardBlocks,
        xpPoints: { increment: xpAwarded },
      },
    });

    return {
      awarded: rewarded.count > 0,
      xpAwarded: rewarded.count > 0 ? xpAwarded : 0,
      streakDays,
      rewardBlocks,
    };
  }

  if (
    user.streakCount !== streakDays ||
    user.attendanceRewardBlocks !== rewardBlocks
  ) {
    await client.user.update({
      where: { id: userId },
      data: {
        streakCount: streakDays,
        attendanceRewardBlocks: rewardBlocks,
      },
    });
  }

  return { awarded: false, xpAwarded: 0, streakDays, rewardBlocks };
}

export async function ensureActiveEnrollmentWithXp(
  userId: string,
  courseId: string,
  status: EnrollmentStatus = 'ACTIVE',
  reactivateExisting = true,
) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.enrollment.createMany({
      data: [{ userId, courseId, status }],
      skipDuplicates: true,
    });

    if (created.count === 0) {
      const enrollment = reactivateExisting
        ? await tx.enrollment.update({
            where: { userId_courseId: { userId, courseId } },
            data: { status },
          })
        : await tx.enrollment.findUnique({
            where: { userId_courseId: { userId, courseId } },
          });

      if (!enrollment) {
        throw new Error('Enrollment exists but could not be reloaded.');
      }

      return { created: false, enrollment };
    }

    await tx.user.updateMany({
      where: {
        id: userId,
        role: 'STUDENT',
      },
      data: {
        xpPoints: { increment: COURSE_ENROLLMENT_XP },
      },
    });

    const enrollment = await tx.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      throw new Error('Enrollment was created but could not be reloaded.');
    }

    return { created: true, enrollment };
  });
}
