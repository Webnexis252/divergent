// @vitest-environment node
/**
 * The progress page's weekly goals against a real Postgres: they must count
 * only this week (from Monday 00:00 IST), and the weekly study time is kept
 * by an upsert keyed on a DATE column, which mocks can't check.
 *
 * Opt-in, like engagement.integration.test.ts: set TEST_DATABASE_URL to a
 * disposable database built with `prisma migrate deploy`.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertDifferentDatabases, assertWritableDatabase } from '../../../scripts/lib/db-guard.mjs';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const HOUR = 3_600_000;

// Wednesday 7 Oct 2026, 12:00 IST; the week began Monday 5 Oct, 00:00 IST
const NOW = new Date('2026-10-07T06:30:00Z');
const WEEK_STARTS_AT = new Date('2026-10-04T18:30:00Z');
const at = (offsetHours: number) => new Date(WEEK_STARTS_AT.getTime() + offsetHours * HOUR);

describe.skipIf(!TEST_DATABASE_URL)('weekly goals (integration)', () => {
  let prisma: PrismaClient;
  let studyTime: typeof import('@/lib/study-time');
  let progress: typeof import('@/lib/student-progress');

  beforeAll(async () => {
    assertDifferentDatabases(TEST_DATABASE_URL, process.env.DATABASE_URL, 'run destructive integration tests');
    assertWritableDatabase(TEST_DATABASE_URL, 'run destructive integration tests');
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    prisma = (await import('@/lib/prisma')).default as unknown as PrismaClient;
    studyTime = await import('@/lib/study-time');
    progress = await import('@/lib/student-progress');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "WeeklyStudyTime", "LessonProgress", "Lesson", "Chapter", "Attendance", "AssignmentSubmission", "Assignment", "LiveClass", "Enrollment", "Course", "User" CASCADE',
    );
    // Only Date is faked, so database I/O timers keep running
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  let seq = 0;
  const unique = () => `${Date.now()}-${++seq}`;

  async function seedStudent() {
    const student = await prisma.user.create({ data: { email: `s-${unique()}@test.local` } });
    const id = unique();
    const course = await prisma.course.create({ data: { title: `Course ${id}`, slug: `course-${id}` } });
    await prisma.enrollment.create({ data: { userId: student.id, courseId: course.id } });
    return { studentId: student.id, courseId: course.id };
  }

  function goal(result: Awaited<ReturnType<typeof progress.getStudentProgress>>, title: string) {
    return result.weeklyGoals.find((g) => g.title === title)?.percent;
  }

  it('keeps study time per week, adding up within a week', async () => {
    const { studentId } = await seedStudent();

    await studyTime.addStudyTime(prisma, studentId, 600, at(-2)); // Sunday night: last week
    await studyTime.addStudyTime(prisma, studentId, 900, at(1));
    await studyTime.addStudyTime(prisma, studentId, 300, at(30));

    const rows = await prisma.weeklyStudyTime.findMany({ where: { userId: studentId }, orderBy: { weekStart: 'asc' } });
    expect(rows.map((r) => [r.weekStart.toISOString().slice(0, 10), r.seconds])).toEqual([
      ['2026-09-28', 600],
      ['2026-10-05', 1200],
    ]);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: studentId } });
    expect(user.totalStudyTime).toBe(1800);
  });

  it("counts only this week's activity toward the goals", async () => {
    const { studentId, courseId } = await seedStudent();

    // Study: 10h last week is ignored, 3h this week is 20% of 15h
    await studyTime.addStudyTime(prisma, studentId, 10 * 3600, at(-30));
    await studyTime.addStudyTime(prisma, studentId, 3 * 3600, at(20));

    // Assignments: one Sunday night (last week), one this week -> 1 of 8
    const [a1, a2] = await Promise.all(
      [1, 2].map((n) => prisma.assignment.create({ data: { courseId, title: `Assignment ${n}` } })),
    );
    await prisma.assignmentSubmission.create({ data: { assignmentId: a1.id, studentId, submittedAt: at(-1) } });
    await prisma.assignmentSubmission.create({ data: { assignmentId: a2.id, studentId, submittedAt: at(10) } });

    // Lectures: of this week's two ended classes the student attended one;
    // last week's attended class and tomorrow's class don't count -> 50%
    const lecture = (startTime: Date) =>
      prisma.liveClass.create({ data: { courseId, title: 'Optics', startTime, duration: 60 } });
    const lastWeek = await lecture(at(-24));
    const monday = await lecture(at(10));
    await lecture(at(34));
    await lecture(at(72));
    for (const liveClassId of [lastWeek.id, monday.id]) {
      await prisma.attendance.create({
        data: { liveClassId, userId: studentId, joinedAt: at(10), watchTimeSecs: 3600, isCounted: true },
      });
    }

    // Lessons: one completed Sunday night, two this week -> 2 of 10
    const chapter = await prisma.chapter.create({ data: { courseId, title: 'Waves', isPublished: true } });
    const lessons = await Promise.all(
      [1, 2, 3].map((n) =>
        prisma.lesson.create({ data: { chapterId: chapter.id, title: `Lesson ${n}`, isPublished: true } }),
      ),
    );
    for (const [i, completedAt] of [at(-3), at(5), at(25)].entries()) {
      await prisma.lessonProgress.create({
        data: { userId: studentId, lessonId: lessons[i].id, isCompleted: true, updatedAt: completedAt },
      });
    }

    const result = await progress.getStudentProgress(studentId);

    expect(result.weeklyStudyHours).toBe(3);
    expect(goal(result, 'Complete 15 hours of study')).toBe(20);
    expect(goal(result, 'Finish 8 assignments')).toBe(13);
    expect(goal(result, 'Attend all lectures')).toBe(50);
    expect(goal(result, 'Review course materials')).toBe(20);
  });

  it('starts every goal from zero on Monday', async () => {
    const { studentId } = await seedStudent();
    await studyTime.addStudyTime(prisma, studentId, 5 * 3600, at(-5));

    const result = await progress.getStudentProgress(studentId);

    expect(result.weeklyStudyHours).toBe(0);
    expect(result.weeklyGoals.map((g) => g.percent)).toEqual([0, 0, 0, 0]);
  });
});
