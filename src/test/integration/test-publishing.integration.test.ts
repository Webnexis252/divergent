// @vitest-environment node
/**
 * CourseTest.publishedAt against a real Postgres: it is set by a database
 * trigger and backfilled by SQL in its migration, neither of which mocks can check.
 *
 * Opt-in, like engagement.integration.test.ts: set TEST_DATABASE_URL to a
 * disposable database built with `prisma migrate deploy`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertDifferentDatabases, assertWritableDatabase } from '../../../scripts/lib/db-guard.mjs';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const MIGRATION = path.join(process.cwd(), 'prisma/migrations/20261008090000_add_test_published_at/migration.sql');

describe.skipIf(!TEST_DATABASE_URL)('test publishing (integration)', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    assertDifferentDatabases(TEST_DATABASE_URL, process.env.DATABASE_URL, 'run destructive integration tests');
    assertWritableDatabase(TEST_DATABASE_URL, 'run destructive integration tests');
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    prisma = (await import('@/lib/prisma')).default as unknown as PrismaClient;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  let courseId: string;
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "TestAttempt", "CourseTest", "Course", "User" CASCADE');
    const slug = `course-${Date.now()}`;
    courseId = (await prisma.course.create({ data: { title: 'Physics', slug } })).id;
  });

  const newTest = (data: { status?: 'DRAFT' | 'PUBLISHED'; publishedAt?: Date } = {}) =>
    prisma.courseTest.create({ data: { courseId, title: 'Optics', ...data } });

  // Within a minute of now: catches a publish time written in the session's local time instead of UTC
  const expectNow = (date: Date | null) => {
    expect(date).not.toBeNull();
    expect(Math.abs(date!.getTime() - Date.now())).toBeLessThan(60_000);
  };

  it('leaves drafts unpublished', async () => {
    const draft = await newTest();
    expect(draft.publishedAt).toBeNull();

    const renamed = await prisma.courseTest.update({ where: { id: draft.id }, data: { title: 'Waves' } });
    expect(renamed.publishedAt).toBeNull();
  });

  it('stamps the time a draft is published', async () => {
    const draft = await newTest();
    const published = await prisma.courseTest.update({ where: { id: draft.id }, data: { status: 'PUBLISHED' } });
    expectNow(published.publishedAt);
  });

  it('stamps tests created already published', async () => {
    expectNow((await newTest({ status: 'PUBLISHED' })).publishedAt);
  });

  it('keeps the first publish time when a test is unpublished and published again', async () => {
    const original = new Date('2026-06-01T05:00:00Z');
    const test = await newTest({ status: 'PUBLISHED', publishedAt: original });

    await prisma.courseTest.update({ where: { id: test.id }, data: { status: 'DRAFT' } });
    const republished = await prisma.courseTest.update({ where: { id: test.id }, data: { status: 'PUBLISHED' } });

    expect(republished.publishedAt).toEqual(original);
  });

  it("backfills published tests with the earlier of their last update and first attempt", async () => {
    const student = await prisma.user.create({ data: { email: `s-${Date.now()}@test.local` } });
    const attempted = await newTest({ status: 'PUBLISHED' });
    const untouched = await newTest({ status: 'PUBLISHED' });
    const draft = await newTest();

    // As before the migration: no publish times, rows last updated in June
    // A timestamp literal, not a JS Date: raw-SQL Date params shift with the session time zone
    await prisma.$executeRawUnsafe(
      `UPDATE "CourseTest" SET "publishedAt" = NULL, "updatedAt" = TIMESTAMP '2026-06-20 05:00:00'`,
    );
    await prisma.testAttempt.create({
      data: { testId: attempted.id, userId: student.id, answers: {}, startedAt: new Date('2026-06-02T05:00:00Z') },
    });

    const backfill = readFileSync(MIGRATION, 'utf8').match(/UPDATE "CourseTest"[\s\S]*?;/)![0];
    await prisma.$executeRawUnsafe(backfill);

    const publishedAt = async (id: string) =>
      (await prisma.courseTest.findUniqueOrThrow({ where: { id } })).publishedAt?.toISOString() ?? null;
    expect(await publishedAt(attempted.id)).toBe('2026-06-02T05:00:00.000Z');
    expect(await publishedAt(untouched.id)).toBe('2026-06-20T05:00:00.000Z');
    expect(await publishedAt(draft.id)).toBeNull();
  });
});
