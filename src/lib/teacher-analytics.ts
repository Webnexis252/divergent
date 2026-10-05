import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Teacher analytics computed in SQL. The previous route loaded every active
 * enrollment (with its user and course), every lesson-progress row in the
 * window and every new enrollment into the function, then passed every student
 * id back to Postgres in `IN (...)` lists. That grows with the student count
 * and breaks outright past Postgres's ~32k bind-parameter limit; these queries
 * return a fixed number of rows whatever the size of the school.
 */

export type AnalyticsScope = {
  courseId?: string;
  cohortId?: string;
};

function cohortFilter(column: Prisma.Sql, cohortId?: string) {
  return cohortId
    ? Prisma.sql`AND ${column} IN (SELECT "studentId" FROM "CohortStudent" WHERE "cohortId" = ${cohortId})`
    : Prisma.empty;
}

/** Distinct students with an active enrollment. */
export async function countActiveStudents({ courseId, cohortId }: AnalyticsScope): Promise<number> {
  const [row] = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT COUNT(DISTINCT e."userId")::int AS count
    FROM "Enrollment" e
    WHERE e.status = 'ACTIVE'
    ${courseId ? Prisma.sql`AND e."courseId" = ${courseId}` : Prisma.empty}
    ${cohortFilter(Prisma.sql`e."userId"`, cohortId)}
  `);
  return row?.count ?? 0;
}

/** Lesson-progress rows touched since `since`: how many, how many completed, and by how many students. */
export async function summarizeLessonProgress(since: Date, { cohortId }: AnalyticsScope) {
  const [row] = await prisma.$queryRaw<Array<{ total: number; completed: number; learners: number }>>(Prisma.sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE lp."isCompleted")::int AS completed,
      COUNT(DISTINCT lp."userId")::int AS learners
    FROM "LessonProgress" lp
    WHERE lp."updatedAt" >= ${since}
    ${cohortFilter(Prisma.sql`lp."userId"`, cohortId)}
  `);
  return row ?? { total: 0, completed: 0, learners: 0 };
}

/** New enrollments since `since`, keyed by UTC day (YYYY-MM-DD), as the in-memory bucketing used on Vercel. */
export async function countEnrollmentsByDay(since: Date, { courseId, cohortId }: AnalyticsScope) {
  const rows = await prisma.$queryRaw<Array<{ day: string; count: number }>>(Prisma.sql`
    SELECT to_char(e."createdAt", 'YYYY-MM-DD') AS day, COUNT(*)::int AS count
    FROM "Enrollment" e
    WHERE e."createdAt" >= ${since}
    ${courseId ? Prisma.sql`AND e."courseId" = ${courseId}` : Prisma.empty}
    ${cohortFilter(Prisma.sql`e."userId"`, cohortId)}
    GROUP BY 1
  `);
  return new Map(rows.map((row) => [row.day, row.count]));
}

/**
 * How quickly doubts get a first human answer: the first reply that isn't
 * AI-generated and isn't from the student who asked.
 */
export async function summarizeDoubtResponseTimes(since: Date, { cohortId }: AnalyticsScope) {
  const [row] = await prisma.$queryRaw<
    Array<{ asked: number; answered: number; withinTwoHours: number; medianSeconds: number | null }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::int AS asked,
      COUNT(fr.first_reply)::int AS answered,
      COUNT(*) FILTER (WHERE fr.first_reply <= t."createdAt" + INTERVAL '2 hours')::int AS "withinTwoHours",
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM fr.first_reply - t."createdAt")
      )::float8 AS "medianSeconds"
    FROM "DoubtTicket" t
    LEFT JOIN LATERAL (
      SELECT MIN(r."createdAt") AS first_reply
      FROM "DoubtReply" r
      WHERE r."doubtTicketId" = t.id
        AND NOT r."isAiGenerated"
        AND r."authorId" IS DISTINCT FROM t."studentId"
    ) fr ON true
    WHERE t."createdAt" >= ${since}
    ${cohortFilter(Prisma.sql`t."studentId"`, cohortId)}
  `);
  return {
    asked: row?.asked ?? 0,
    answered: row?.answered ?? 0,
    withinTwoHours: row?.withinTwoHours ?? 0,
    medianMinutes: row?.medianSeconds == null ? null : Math.round(row.medianSeconds / 60),
  };
}

export type MentorResponseTime = {
  asked: number;
  answered: number;
  withinTwoHours: number;
  medianMinutes: number | null;
};

/** The same first-answer measure, per assigned teacher, for doubts asked since `since`. */
export async function doubtResponseTimesByMentor(since: Date): Promise<Map<string, MentorResponseTime>> {
  const rows = await prisma.$queryRaw<
    Array<{ mentorId: string; asked: number; answered: number; withinTwoHours: number; medianSeconds: number | null }>
  >(Prisma.sql`
    SELECT
      t."mentorId" AS "mentorId",
      COUNT(*)::int AS asked,
      COUNT(fr.first_reply)::int AS answered,
      COUNT(*) FILTER (WHERE fr.first_reply <= t."createdAt" + INTERVAL '2 hours')::int AS "withinTwoHours",
      percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM fr.first_reply - t."createdAt")
      )::float8 AS "medianSeconds"
    FROM "DoubtTicket" t
    LEFT JOIN LATERAL (
      SELECT MIN(r."createdAt") AS first_reply
      FROM "DoubtReply" r
      WHERE r."doubtTicketId" = t.id
        AND NOT r."isAiGenerated"
        AND r."authorId" IS DISTINCT FROM t."studentId"
    ) fr ON true
    WHERE t."createdAt" >= ${since} AND t."mentorId" IS NOT NULL
    GROUP BY t."mentorId"
  `);
  return new Map(
    rows.map((row) => [
      row.mentorId,
      {
        asked: row.asked,
        answered: row.answered,
        withinTwoHours: row.withinTwoHours,
        medianMinutes: row.medianSeconds == null ? null : Math.round(row.medianSeconds / 60),
      },
    ]),
  );
}

type PerformanceRow = {
  kind: 'needs' | 'top';
  userId: string;
  perf: number;
  courseTitle: string | null;
  total: bigint;
  name: string | null;
  streakCount: number;
};

export const NEEDS_ATTENTION_LIMIT = 100;
const TOP_PER_COURSE = 5;
const TOP_LIMIT = 15;

/**
 * Performance score per actively enrolled student, the same formula the route
 * used: 40% exam points earned / possible, 30% counted attendance / classes held
 * in their courses, 30% submissions / assignments in their courses (each ratio
 * capped at 1; a part with nothing expected scores 0).
 *
 * Returns the lowest-scoring students under 40 (capped, with the full count)
 * and the top 5 at or above 40 in each course, deduplicated, best 15 overall.
 */
export async function rankStudentPerformance(now: Date, { courseId, cohortId }: AnalyticsScope) {
  const rows = await prisma.$queryRaw<PerformanceRow[]>(Prisma.sql`
    WITH enr AS (
      SELECT e."userId", e."courseId"
      FROM "Enrollment" e
      WHERE e.status = 'ACTIVE'
      ${courseId ? Prisma.sql`AND e."courseId" = ${courseId}` : Prisma.empty}
      ${cohortFilter(Prisma.sql`e."userId"`, cohortId)}
    ),
    course_totals AS (
      SELECT c."courseId",
        (SELECT COUNT(*) FROM "LiveClass" lc WHERE lc."courseId" = c."courseId" AND lc."startTime" <= ${now}) AS classes,
        (SELECT COUNT(*) FROM "Assignment" a WHERE a."courseId" = c."courseId") AS assignments
      FROM (SELECT DISTINCT "courseId" FROM enr) c
    ),
    students AS (
      SELECT enr."userId", SUM(ct.classes) AS expected_classes, SUM(ct.assignments) AS expected_assignments
      FROM enr JOIN course_totals ct USING ("courseId")
      GROUP BY enr."userId"
    ),
    scored AS (
      SELECT s."userId",
        ROUND(
            40 * CASE WHEN COALESCE(t.total, 0) > 0 THEN t.earned::numeric / t.total ELSE 0 END
          + 30 * CASE WHEN s.expected_classes > 0 THEN LEAST(1, att.n::numeric / s.expected_classes) ELSE 0 END
          + 30 * CASE WHEN s.expected_assignments > 0 THEN LEAST(1, sub.n::numeric / s.expected_assignments) ELSE 0 END
        )::int AS perf
      FROM students s
      LEFT JOIN LATERAL (
        SELECT SUM(ta."pointsEarned") AS earned, SUM(ta."totalPoints") AS total
        FROM "TestAttempt" ta WHERE ta."userId" = s."userId"
      ) t ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS n FROM "Attendance" a WHERE a."userId" = s."userId" AND a."isCounted"
      ) att ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS n FROM "AssignmentSubmission" sb WHERE sb."studentId" = s."userId"
      ) sub ON true
    ),
    needs AS (
      SELECT 'needs'::text AS kind, sc."userId", sc.perf, NULL::text AS "courseTitle", COUNT(*) OVER () AS total
      FROM scored sc
      WHERE sc.perf < 40
      ORDER BY sc.perf ASC
      LIMIT ${NEEDS_ATTENTION_LIMIT}
    ),
    ranked AS (
      SELECT sc."userId", sc.perf, c.title AS "courseTitle",
        ROW_NUMBER() OVER (PARTITION BY enr."courseId" ORDER BY sc.perf DESC) AS rn
      FROM scored sc
      JOIN enr USING ("userId")
      JOIN "Course" c ON c.id = enr."courseId"
      WHERE sc.perf >= 40
    ),
    top AS (
      SELECT DISTINCT ON (r."userId") 'top'::text AS kind, r."userId", r.perf, r."courseTitle", 0::bigint AS total
      FROM ranked r
      WHERE r.rn <= ${TOP_PER_COURSE}
      ORDER BY r."userId", r.perf DESC
    )
    SELECT x.kind, x."userId", x.perf, x."courseTitle", x.total, u.name, u."streakCount"
    FROM (
      SELECT * FROM needs
      UNION ALL
      (SELECT * FROM top ORDER BY perf DESC LIMIT ${TOP_LIMIT})
    ) x
    JOIN "User" u ON u.id = x."userId"
  `);

  const needs = rows.filter((r) => r.kind === 'needs').sort((a, b) => a.perf - b.perf);
  const top = rows.filter((r) => r.kind === 'top').sort((a, b) => b.perf - a.perf);

  return {
    needsAttentionCount: needs.length > 0 ? Number(needs[0].total) : 0,
    needsAttention: needs.map((s) => ({
      id: s.userId,
      name: s.name ?? 'Unknown',
      detail: `Performance: ${s.perf}%`,
      streakCount: s.streakCount,
    })),
    topStudents: top.map((s) => ({
      id: s.userId,
      name: s.name ?? 'Unknown',
      detail: `${s.perf}% in ${s.courseTitle ?? ''} · ${s.streakCount}-day streak`,
      streakCount: s.streakCount,
    })),
  };
}
