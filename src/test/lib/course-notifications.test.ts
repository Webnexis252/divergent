import { describe, it, expect, vi, beforeEach } from 'vitest';

const { findMany, createMany, afterCallbacks } = vi.hoisted(() => ({
  findMany: vi.fn(),
  createMany: vi.fn(),
  afterCallbacks: [] as Array<() => Promise<unknown> | unknown>,
}));

vi.mock('@/lib/prisma', () => ({
  default: { enrollment: { findMany }, notification: { createMany } },
}));
vi.mock('next/server', () => ({
  after: (callback: () => Promise<unknown> | unknown) => afterCallbacks.push(callback),
}));

import { notifyCourseStudents, notifyCourseStudentsInBackground } from '@/lib/course-notifications';

/** Simulates cursor pagination over `total` ACTIVE enrollments with ids e0000… */
function seedEnrollments(total: number) {
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `e${String(i).padStart(6, '0')}`,
    userId: `u${i}`,
  }));
  findMany.mockImplementation(async (args: { take: number; cursor?: { id: string } }) => {
    const start = args.cursor ? rows.findIndex((r) => r.id === args.cursor!.id) + 1 : 0;
    return rows.slice(start, start + args.take);
  });
}

const content = { title: 'New Assignment: Algebra', body: 'Submit before Friday', actionUrl: '/dashboard/assignments' };

beforeEach(() => {
  findMany.mockReset();
  createMany.mockReset();
  createMany.mockImplementation(async ({ data }: { data: unknown[] }) => ({ count: data.length }));
  afterCallbacks.length = 0;
});

describe('notifyCourseStudents', () => {
  it('pages through enrollments and inserts one chunk per page', async () => {
    seedEnrollments(4500);

    const created = await notifyCourseStudents('course-1', content);

    expect(created).toBe(4500);
    expect(createMany.mock.calls.map(([arg]) => arg.data.length)).toEqual([2000, 2000, 500]);
    expect(findMany.mock.calls[1][0].cursor).toEqual({ id: 'e001999' });
    expect(findMany.mock.calls[0][0].where).toEqual({ courseId: 'course-1', status: 'ACTIVE' });
  });

  it('writes the same content for every student, defaulting type to INFO', async () => {
    seedEnrollments(2);

    await notifyCourseStudents('course-1', content);

    expect(createMany.mock.calls[0][0].data).toEqual([
      { userId: 'u0', ...content, type: 'INFO' },
      { userId: 'u1', ...content, type: 'INFO' },
    ]);
  });

  it('does nothing for a course with no active students', async () => {
    seedEnrollments(0);

    expect(await notifyCourseStudents('course-1', content)).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });
});

describe('notifyCourseStudentsInBackground', () => {
  it('defers the work until after the response', async () => {
    seedEnrollments(3);

    notifyCourseStudentsInBackground('course-1', content);
    expect(findMany).not.toHaveBeenCalled();

    await afterCallbacks[0]();
    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('logs failures instead of throwing', async () => {
    findMany.mockRejectedValue(new Error('db down'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await notifyCourseStudentsInBackground('course-1', content);
    await expect(afterCallbacks[0]()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith('[JOBS] course-notify failed', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('logs a failed queue publish instead of failing the request', async () => {
    vi.stubEnv('QSTASH_TOKEN', 'token');
    vi.stubEnv('APP_URL', 'https://lms.example.com');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('quota exceeded', { status: 429 })));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(notifyCourseStudentsInBackground('course-1', content)).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith('[COURSE_NOTIFY_ERROR]', expect.objectContaining({ courseId: 'course-1' }));
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
