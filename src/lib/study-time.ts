import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

// India has no daylight saving, so a fixed offset is exact
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * The study week containing `now`, which starts Monday 00:00 IST and is what
 * the weekly goals reset on. `startsAt` is that instant, for filtering
 * timestamps; `weekStart` is the Monday's date (at UTC midnight), the key of
 * a WeeklyStudyTime row.
 */
export function studyWeek(now = new Date()) {
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);
  const daysSinceMonday = (istNow.getUTCDay() + 6) % 7;
  const weekStart = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysSinceMonday),
  );
  return { weekStart, startsAt: new Date(weekStart.getTime() - IST_OFFSET_MS) };
}

/** Adds study time to the student's lifetime total and to the current week's. */
export async function addStudyTime(
  client: PrismaClientLike,
  userId: string,
  seconds: number,
  now = new Date(),
) {
  if (seconds <= 0) return;
  const { weekStart } = studyWeek(now);

  await Promise.all([
    client.user.update({
      where: { id: userId },
      data: { totalStudyTime: { increment: seconds } },
    }),
    client.weeklyStudyTime.upsert({
      where: { userId_weekStart: { userId, weekStart } },
      create: { userId, weekStart, seconds },
      update: { seconds: { increment: seconds } },
    }),
  ]);
}
