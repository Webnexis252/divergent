import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendWhatsAppTemplate } from '@/lib/interakt';

/**
 * WhatsApp reminders shortly before a live class starts.
 *
 * Needs an approved Interakt template named by INTERAKT_CLASS_REMINDER_TEMPLATE_NAME
 * with three body placeholders: {{1}} student's first name, {{2}} class title,
 * {{3}} start time (e.g. "4:00 pm IST"). Without it nothing is sent.
 *
 * Schedule GET /api/cron/class-reminders every 5 minutes (QStash schedule or a
 * Vercel Pro cron). Each run picks up classes starting 5–15 minutes from now,
 * so a class is seen by two runs; the LiveClassReminder table records every
 * student reminded, so nobody is messaged twice, even when a batch is retried.
 */

export const REMINDER_BATCH_SIZE = 200;
const SEND_CONCURRENCY = 5;
const WINDOW_START_MINUTES = 5;
const WINDOW_END_MINUTES = 15;

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

export function classReminderTemplate(): string | null {
  return process.env.INTERAKT_CLASS_REMINDER_TEMPLATE_NAME || null;
}

/** Live classes starting 5–15 minutes after `now` that haven't ended. */
export async function findClassesStartingSoon(now = new Date()) {
  return prisma.liveClass.findMany({
    where: {
      isEnded: false,
      startTime: {
        gte: new Date(now.getTime() + WINDOW_START_MINUTES * 60_000),
        lt: new Date(now.getTime() + WINDOW_END_MINUTES * 60_000),
      },
    },
    select: { id: true },
  });
}

/**
 * Reminds one batch of the class's actively enrolled students who have a phone
 * number, starting after the user id `cursor`. Returns the cursor for the next
 * batch, or null when done.
 */
export async function sendClassReminderBatch(
  liveClassId: string,
  cursor?: string,
): Promise<{ sent: number; failed: number; nextCursor: string | null }> {
  const template = classReminderTemplate();
  if (!template) return { sent: 0, failed: 0, nextCursor: null };

  const liveClass = await prisma.liveClass.findUnique({
    where: { id: liveClassId },
    select: { id: true, title: true, startTime: true, courseId: true, isEnded: true },
  });
  if (!liveClass || liveClass.isEnded) return { sent: 0, failed: 0, nextCursor: null };

  const students = await prisma.$queryRaw<Array<{ id: string; name: string | null; phone: string }>>(Prisma.sql`
    SELECT u.id, u.name, u.phone
    FROM "Enrollment" e
    JOIN "User" u ON u.id = e."userId"
    WHERE e."courseId" = ${liveClass.courseId}
      AND e.status = 'ACTIVE'
      AND u.phone IS NOT NULL
      ${cursor ? Prisma.sql`AND u.id > ${cursor}` : Prisma.empty}
    ORDER BY u.id
    LIMIT ${REMINDER_BATCH_SIZE}
  `);
  if (students.length === 0) return { sent: 0, failed: 0, nextCursor: null };

  // Claim before sending: only students not already reminded come back
  const claimed = await prisma.$queryRaw<Array<{ userId: string }>>(Prisma.sql`
    INSERT INTO "LiveClassReminder" ("liveClassId", "userId")
    SELECT ${liveClass.id}, unnest(${students.map((s) => s.id)}::text[])
    ON CONFLICT DO NOTHING
    RETURNING "userId"
  `);
  const toRemind = new Set(claimed.map((c) => c.userId));
  const startsAt = `${timeFormatter.format(liveClass.startTime)} IST`;

  let sent = 0;
  let failed = 0;
  const queue = students.filter((s) => toRemind.has(s.id));
  const workers = Array.from({ length: SEND_CONCURRENCY }, async () => {
    for (let student = queue.shift(); student; student = queue.shift()) {
      const firstName = (student.name ?? '').trim().split(/\s+/)[0] || 'there';
      try {
        await sendWhatsAppTemplate(
          student.phone,
          template,
          [firstName, liveClass.title, startsAt],
          `class_reminder_${liveClass.id}`,
        );
        sent++;
      } catch (err) {
        failed++;
        console.error('[CLASS_REMINDER] Send failed', { liveClassId, userId: student.id, err });
        // Release the claim so a retried batch tries this student again
        await prisma.liveClassReminder
          .delete({ where: { liveClassId_userId: { liveClassId: liveClass.id, userId: student.id } } })
          .catch(() => undefined);
      }
    }
  });
  await Promise.all(workers);

  return {
    sent,
    failed,
    nextCursor: students.length < REMINDER_BATCH_SIZE ? null : students[students.length - 1].id,
  };
}
