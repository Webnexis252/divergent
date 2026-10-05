import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Chart series grouped in SQL, so dashboards get 12 or 30 numbers back instead
 * of loading every enrollment or payment row into the function. Months and
 * days are UTC, matching `Date#getMonth()` / `toISOString()` on Vercel's UTC
 * servers, which the previous in-memory bucketing used.
 */

/** Enrollments created since `since`, per calendar month (index 0 = January). */
export async function countEnrollmentsByMonth(
  since: Date,
  courseIds?: string[],
): Promise<number[]> {
  const rows = await prisma.$queryRaw<Array<{ month: number; count: number }>>(Prisma.sql`
    SELECT EXTRACT(MONTH FROM "createdAt")::int - 1 AS month, COUNT(*)::int AS count
    FROM "Enrollment"
    WHERE "createdAt" >= ${since}
    ${courseIds ? Prisma.sql`AND "courseId" = ANY(${courseIds})` : Prisma.empty}
    GROUP BY 1
  `);

  const counts = new Array<number>(12).fill(0);
  for (const row of rows) counts[row.month] = row.count;
  return counts;
}

/** Successful payment totals since `since`, keyed by UTC day (YYYY-MM-DD). */
export async function sumSuccessfulPaymentsByDay(since: Date): Promise<Map<string, number>> {
  const rows = await prisma.$queryRaw<Array<{ day: string; revenue: number }>>(Prisma.sql`
    SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, SUM("amount")::float8 AS revenue
    FROM "Payment"
    WHERE "status" = 'SUCCESS' AND "createdAt" >= ${since}
    GROUP BY 1
  `);

  return new Map(rows.map((row) => [row.day, row.revenue]));
}
