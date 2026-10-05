import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendWeeklyReportEmail } from '@/lib/email';
import { safeEqual } from '@/lib/secure-compare';

/**
 * Sunday-evening progress emails for students with an active enrollment.
 *
 * Off unless WEEKLY_REPORTS_ENABLED=true. Before turning it on at scale, point
 * EMAIL_HOST at a bulk email provider (SES, Postmark, Resend, …): a Gmail SMTP
 * account stops at roughly 2,000 messages a day.
 *
 * Runs as the `weekly-reports` job, one batch of students per step. Each
 * student is claimed in WeeklyReportDelivery before sending, so a retried batch
 * never emails anyone twice; a failed send releases the claim.
 */

export const REPORT_BATCH_SIZE = 200;
const SEND_CONCURRENCY = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export function weeklyReportsEnabled(): boolean {
  return process.env.WEEKLY_REPORTS_ENABLED === 'true';
}

function appUrl(): string {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function unsubscribeSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required to sign unsubscribe links');
  return secret;
}

export function unsubscribeToken(userId: string): string {
  return crypto.createHmac('sha256', unsubscribeSecret()).update(`weekly-report-optout:${userId}`).digest('hex');
}

export function isValidUnsubscribeToken(userId: string, token: string): boolean {
  return safeEqual(token, unsubscribeToken(userId));
}

export function unsubscribeUrl(userId: string): string {
  return `${appUrl()}/api/reports/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

/** The IST calendar date (YYYY-MM-DD) a report sent at `now` covers up to. */
export function reportWeekEnding(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

/** The seven days ending at the end of `weekEnding` in IST. */
export function reportWindow(weekEnding: string) {
  const end = new Date(new Date(`${weekEnding}T00:00:00+05:30`).getTime() + DAY_MS);
  const start = new Date(end.getTime() - 7 * DAY_MS);
  const format = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  return { start, end, label: `${format.format(start)} – ${format.format(new Date(end.getTime() - 1))}` };
}

type StudentWeek = {
  id: string;
  name: string | null;
  email: string;
  streakCount: number;
  xpPoints: number;
  classesAttended: number;
  lessonsCompleted: number;
  assignmentsSubmitted: number;
  testsTaken: number;
  testScorePercent: number | null;
};

/**
 * Sends one batch of reports for the week ending `weekEnding`, to students
 * after the user id `cursor`. Returns the cursor for the next batch, or null.
 */
export async function sendWeeklyReportBatch(
  weekEnding: string,
  cursor?: string,
): Promise<{ sent: number; failed: number; nextCursor: string | null }> {
  if (!weeklyReportsEnabled()) return { sent: 0, failed: 0, nextCursor: null };
  const { start, end, label } = reportWindow(weekEnding);

  const recipients = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT u.id
    FROM "User" u
    WHERE u.role = 'STUDENT'
      AND u.email IS NOT NULL
      ${cursor ? Prisma.sql`AND u.id > ${cursor}` : Prisma.empty}
      AND EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."userId" = u.id AND e.status = 'ACTIVE')
      AND NOT EXISTS (SELECT 1 FROM "UserPreference" p WHERE p."userId" = u.id AND p."weeklyReportOptOut")
    ORDER BY u.id
    LIMIT ${REPORT_BATCH_SIZE}
  `);
  if (recipients.length === 0) return { sent: 0, failed: 0, nextCursor: null };
  const nextCursor = recipients.length < REPORT_BATCH_SIZE ? null : recipients[recipients.length - 1].id;

  // Claim before sending: only students not already sent this week's report come back
  const claimed = await prisma.$queryRaw<Array<{ userId: string }>>(Prisma.sql`
    INSERT INTO "WeeklyReportDelivery" ("userId", "weekEnding")
    SELECT unnest(${recipients.map((r) => r.id)}::text[]), ${weekEnding}::date
    ON CONFLICT DO NOTHING
    RETURNING "userId"
  `);
  if (claimed.length === 0) return { sent: 0, failed: 0, nextCursor };

  const students = await prisma.$queryRaw<StudentWeek[]>(Prisma.sql`
    SELECT
      u.id, u.name, u.email, u."streakCount", u."xpPoints",
      (SELECT COUNT(*) FROM "Attendance" a
        WHERE a."userId" = u.id AND a."isCounted" AND a."joinedAt" >= ${start} AND a."joinedAt" < ${end})::int AS "classesAttended",
      (SELECT COUNT(*) FROM "LessonProgress" lp
        WHERE lp."userId" = u.id AND lp."isCompleted" AND lp."updatedAt" >= ${start} AND lp."updatedAt" < ${end})::int AS "lessonsCompleted",
      (SELECT COUNT(*) FROM "AssignmentSubmission" s
        WHERE s."studentId" = u.id AND s."submittedAt" >= ${start} AND s."submittedAt" < ${end})::int AS "assignmentsSubmitted",
      t.taken AS "testsTaken",
      t.percent AS "testScorePercent"
    FROM "User" u
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::int AS taken,
        ROUND(100.0 * SUM(ta."pointsEarned") / NULLIF(SUM(ta."totalPoints"), 0))::int AS percent
      FROM "TestAttempt" ta
      WHERE ta."userId" = u.id AND ta."submittedAt" >= ${start} AND ta."submittedAt" < ${end}
    ) t
    WHERE u.id = ANY(${claimed.map((c) => c.userId)}::text[])
  `);

  let sent = 0;
  let failed = 0;
  const progressUrl = `${appUrl()}/dashboard/progress`;
  const queue = [...students];
  await Promise.all(
    Array.from({ length: SEND_CONCURRENCY }, async () => {
      for (let student = queue.shift(); student; student = queue.shift()) {
        try {
          await sendWeeklyReportEmail({
            to: student.email,
            name: student.name ?? '',
            weekLabel: label,
            stats: student,
            progressUrl,
            unsubscribeUrl: unsubscribeUrl(student.id),
          });
          sent++;
        } catch (err) {
          failed++;
          console.error('[WEEKLY_REPORT] Send failed', { userId: student.id, err });
          // Release the claim so a retried batch tries this student again
          await prisma.weeklyReportDelivery
            .delete({ where: { userId_weekEnding: { userId: student.id, weekEnding: new Date(`${weekEnding}T00:00:00Z`) } } })
            .catch(() => undefined);
        }
      }
    }),
  );

  return { sent, failed, nextCursor };
}

export async function optOutOfWeeklyReports(userId: string): Promise<void> {
  await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, weeklyReportOptOut: true },
    update: { weeklyReportOptOut: true },
  });
}
