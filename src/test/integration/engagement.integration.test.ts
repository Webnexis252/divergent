// @vitest-environment node
/**
 * Class reminders, weekly reports and teacher analytics against a real
 * Postgres: their correctness lives in raw SQL (claims with ON CONFLICT,
 * LATERAL subqueries, percentiles, window functions), which mocks can't check.
 *
 * Opt-in, like payments.integration.test.ts: set TEST_DATABASE_URL to a
 * disposable database built with `prisma migrate deploy`. Every test truncates
 * tables, so the db-guard refuses production.
 *
 *   TEST_DATABASE_URL="postgresql://postgres@127.0.0.1:55432/lms_test?sslmode=disable" \
 *     npm run test:integration   (files run one at a time: they share the database)
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertDifferentDatabases, assertWritableDatabase } from '../../../scripts/lib/db-guard.mjs';

const mocks = vi.hoisted(() => ({ whatsapp: vi.fn(), email: vi.fn() }));
vi.mock('@/lib/interakt', () => ({ sendWhatsAppTemplate: mocks.whatsapp }));
vi.mock('@/lib/email', () => ({ sendWeeklyReportEmail: mocks.email }));

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const MINUTE = 60_000;

describe.skipIf(!TEST_DATABASE_URL)('engagement (integration)', () => {
  let prisma: PrismaClient;
  let reminders: typeof import('@/lib/class-reminders');
  let reports: typeof import('@/lib/weekly-reports');
  let analytics: typeof import('@/lib/teacher-analytics');

  beforeAll(async () => {
    assertDifferentDatabases(TEST_DATABASE_URL, process.env.DATABASE_URL, 'run destructive integration tests');
    assertWritableDatabase(TEST_DATABASE_URL, 'run destructive integration tests');
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    prisma = (await import('@/lib/prisma')).default as unknown as PrismaClient;
    reminders = await import('@/lib/class-reminders');
    reports = await import('@/lib/weekly-reports');
    analytics = await import('@/lib/teacher-analytics');
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('INTERAKT_CLASS_REMINDER_TEMPLATE_NAME', 'class_reminder');
    vi.stubEnv('WEEKLY_REPORTS_ENABLED', 'true');
    vi.stubEnv('JWT_SECRET', 'test-secret');
    mocks.whatsapp.mockResolvedValue(undefined);
    mocks.email.mockResolvedValue(undefined);
    await prisma.$executeRawUnsafe(
      'TRUNCATE "LiveClassReminder", "WeeklyReportDelivery", "UserPreference", "Attendance", "AssignmentSubmission", "Assignment", "DoubtReply", "DoubtTicket", "LiveClass", "Enrollment", "Course", "User" CASCADE',
    );
  });

  let seq = 0;
  const unique = () => `${Date.now()}-${++seq}`;
  const user = (data: { role?: 'STUDENT' | 'MENTOR'; phone?: string; name?: string } = {}) =>
    prisma.user.create({ data: { email: `u-${unique()}@test.local`, role: data.role ?? 'STUDENT', phone: data.phone, name: data.name } });
  const course = () => {
    const id = unique();
    return prisma.course.create({ data: { title: `Course ${id}`, slug: `course-${id}` } });
  };
  const enroll = (userId: string, courseId: string, status: 'ACTIVE' | 'CANCELLED' = 'ACTIVE') =>
    prisma.enrollment.create({ data: { userId, courseId, status } });
  const liveClass = (courseId: string, startsInMinutes: number) =>
    prisma.liveClass.create({
      data: { courseId, title: 'Rotational motion', startTime: new Date(Date.now() + startsInMinutes * MINUTE), duration: 60 },
    });

  describe('class reminders', () => {
    it('finds only classes starting 5–15 minutes from now', async () => {
      const { id: courseId } = await course();
      const soon = await liveClass(courseId, 10);
      await liveClass(courseId, 30);
      await liveClass(courseId, 2);

      expect((await reminders.findClassesStartingSoon()).map((c) => c.id)).toEqual([soon.id]);
    });

    it('messages each active student with a phone once, however often it runs', async () => {
      const { id: courseId } = await course();
      const a = await user({ phone: '+919800000001', name: 'Asha Rao' });
      const b = await user({ phone: '+919800000002' });
      const noPhone = await user();
      const lapsed = await user({ phone: '+919800000003' });
      await Promise.all([enroll(a.id, courseId), enroll(b.id, courseId), enroll(noPhone.id, courseId), enroll(lapsed.id, courseId, 'CANCELLED')]);
      const lc = await liveClass(courseId, 10);

      const first = await reminders.sendClassReminderBatch(lc.id);
      const second = await reminders.sendClassReminderBatch(lc.id);

      expect(first).toMatchObject({ sent: 2, failed: 0, nextCursor: null });
      expect(second.sent).toBe(0);
      expect(mocks.whatsapp).toHaveBeenCalledTimes(2);
      expect(mocks.whatsapp).toHaveBeenCalledWith('+919800000001', 'class_reminder', ['Asha', 'Rotational motion', expect.stringMatching(/IST$/)], `class_reminder_${lc.id}`);
    });

    it('releases a failed send so the next run retries only that student', async () => {
      const { id: courseId } = await course();
      const a = await user({ phone: '+919800000001' });
      const b = await user({ phone: '+919800000002' });
      await Promise.all([enroll(a.id, courseId), enroll(b.id, courseId)]);
      const lc = await liveClass(courseId, 10);
      mocks.whatsapp.mockImplementation(async (phone: string) => {
        if (phone === '+919800000002') throw new Error('Interakt 500');
      });

      expect(await reminders.sendClassReminderBatch(lc.id)).toMatchObject({ sent: 1, failed: 1 });
      mocks.whatsapp.mockReset().mockResolvedValue(undefined);
      expect(await reminders.sendClassReminderBatch(lc.id)).toMatchObject({ sent: 1, failed: 0 });
      expect(mocks.whatsapp).toHaveBeenCalledWith('+919800000002', expect.anything(), expect.anything(), expect.anything());
    });

    it('sends nothing without a template configured', async () => {
      vi.stubEnv('INTERAKT_CLASS_REMINDER_TEMPLATE_NAME', '');
      const { id: courseId } = await course();
      const a = await user({ phone: '+919800000001' });
      await enroll(a.id, courseId);
      const lc = await liveClass(courseId, 10);
      expect(await reminders.sendClassReminderBatch(lc.id)).toMatchObject({ sent: 0 });
      expect(mocks.whatsapp).not.toHaveBeenCalled();
    });
  });

  describe('weekly reports', () => {
    it('reports the week to enrolled students who have not opted out, once', async () => {
      const weekEnding = reports.reportWeekEnding();
      const { id: courseId } = await course();
      const active = await user({ name: 'Ravi' });
      const optedOut = await user();
      const notEnrolled = await user();
      await Promise.all([enroll(active.id, courseId), enroll(optedOut.id, courseId)]);
      await prisma.userPreference.create({ data: { userId: optedOut.id, weeklyReportOptOut: true } });
      const lc = await liveClass(courseId, -120);
      await prisma.attendance.create({ data: { liveClassId: lc.id, userId: active.id, joinedAt: new Date(Date.now() - 100 * MINUTE), isCounted: true } });

      const first = await reports.sendWeeklyReportBatch(weekEnding);
      const second = await reports.sendWeeklyReportBatch(weekEnding);

      expect(first).toMatchObject({ sent: 1, failed: 0 });
      expect(second.sent).toBe(0);
      expect(mocks.email).toHaveBeenCalledTimes(1);
      const call = mocks.email.mock.calls[0][0];
      expect(call.to).toBe(active.email);
      expect(call.stats).toMatchObject({ classesAttended: 1, lessonsCompleted: 0, testsTaken: 0, testScorePercent: null });
      expect(call.unsubscribeUrl).toContain(`u=${active.id}`);
      expect(notEnrolled.id).not.toBe(call.to);
    });

    it('records an unsubscribe and skips that student next time', async () => {
      const { id: courseId } = await course();
      const student = await user();
      await enroll(student.id, courseId);

      await reports.optOutOfWeeklyReports(student.id);
      await reports.optOutOfWeeklyReports(student.id);

      expect(await reports.sendWeeklyReportBatch(reports.reportWeekEnding())).toMatchObject({ sent: 0 });
    });

    it('lets a failed email be retried', async () => {
      const weekEnding = reports.reportWeekEnding();
      const { id: courseId } = await course();
      const student = await user();
      await enroll(student.id, courseId);
      mocks.email.mockRejectedValueOnce(new Error('SMTP down'));

      expect(await reports.sendWeeklyReportBatch(weekEnding)).toMatchObject({ sent: 0, failed: 1 });
      expect(await reports.sendWeeklyReportBatch(weekEnding)).toMatchObject({ sent: 1, failed: 0 });
    });
  });

  describe('teacher analytics', () => {
    it('measures time to the first human answer, per teacher and overall', async () => {
      const mentor = await user({ role: 'MENTOR' });
      const student = await user();
      const asked = new Date(Date.now() - 5 * 60 * MINUTE);
      const answered = await prisma.doubtTicket.create({
        data: { studentId: student.id, mentorId: mentor.id, subject: 'Q1', body: 'b', createdAt: asked },
      });
      const unanswered = await prisma.doubtTicket.create({
        data: { studentId: student.id, mentorId: mentor.id, subject: 'Q2', body: 'b', createdAt: asked },
      });
      await prisma.doubtReply.createMany({
        data: [
          // Neither the AI reply nor the student's own follow-up counts as an answer
          { doubtTicketId: answered.id, authorId: null, body: 'ai', isAiGenerated: true, createdAt: new Date(asked.getTime() + MINUTE) },
          { doubtTicketId: answered.id, authorId: student.id, body: 'more', createdAt: new Date(asked.getTime() + 2 * MINUTE) },
          { doubtTicketId: answered.id, authorId: mentor.id, body: 'answer', createdAt: new Date(asked.getTime() + 30 * MINUTE) },
          { doubtTicketId: unanswered.id, authorId: student.id, body: 'bump', createdAt: new Date(asked.getTime() + 10 * MINUTE) },
        ],
      });
      const since = new Date(Date.now() - 24 * 60 * MINUTE);

      expect(await analytics.summarizeDoubtResponseTimes(since, {})).toEqual({
        asked: 2,
        answered: 1,
        withinTwoHours: 1,
        medianMinutes: 30,
      });
      expect((await analytics.doubtResponseTimesByMentor(since)).get(mentor.id)).toEqual({
        asked: 2,
        answered: 1,
        withinTwoHours: 1,
        medianMinutes: 30,
      });
    });

    it('scores students with the 40/30/30 formula and splits top from needs-attention', async () => {
      const { id: courseId } = await course();
      const strong = await user({ name: 'Strong' });
      const weak = await user({ name: 'Weak' });
      await Promise.all([enroll(strong.id, courseId), enroll(weak.id, courseId)]);
      const held = await Promise.all([liveClass(courseId, -300), liveClass(courseId, -200)]);
      await liveClass(courseId, 600); // not held yet: doesn't count against anyone
      const assignment = await prisma.assignment.create({ data: { courseId, title: 'Worksheet' } });
      await prisma.attendance.createMany({
        data: held.map((lc) => ({ liveClassId: lc.id, userId: strong.id, joinedAt: lc.startTime, isCounted: true })),
      });
      await prisma.attendance.create({ data: { liveClassId: held[0].id, userId: weak.id, joinedAt: held[0].startTime, isCounted: true } });
      await prisma.assignmentSubmission.create({ data: { assignmentId: assignment.id, studentId: strong.id } });

      const result = await analytics.rankStudentPerformance(new Date(), { courseId });

      // strong: attendance 2/2 → 30, assignments 1/1 → 30, no exams → 60
      // weak:   attendance 1/2 → 15, nothing else → 15
      expect(result.topStudents).toHaveLength(1);
      expect(result.topStudents[0]).toMatchObject({ id: strong.id, name: 'Strong' });
      expect(result.topStudents[0].detail).toMatch(/^60% in Course /);
      expect(result.needsAttention).toEqual([{ id: weak.id, name: 'Weak', detail: 'Performance: 15%', streakCount: 0 }]);
      expect(result.needsAttentionCount).toBe(1);
      expect(await analytics.countActiveStudents({ courseId })).toBe(2);
    });
  });
});
