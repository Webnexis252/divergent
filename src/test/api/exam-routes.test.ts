// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  courseRelation: vi.fn(),
  courseTestFindFirst: vi.fn(),
  lock: vi.fn(),
  attemptFindFirst: vi.fn(),
  attemptCount: vi.fn(),
  attemptUpdate: vi.fn(),
  attemptCreate: vi.fn(),
  userUpdate: vi.fn(),
}));

const tx = {
  $executeRaw: mocks.lock,
  testAttempt: {
    findFirst: mocks.attemptFindFirst,
    count: mocks.attemptCount,
    update: mocks.attemptUpdate,
    create: mocks.attemptCreate,
  },
  user: { update: mocks.userUpdate },
};

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/course-access', () => ({ courseRelation: mocks.courseRelation }));
vi.mock('@/lib/prisma', () => ({
  default: {
    courseTest: { findFirst: mocks.courseTestFindFirst },
    $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
  },
}));

import { POST as submit } from '@/app/api/courses/[courseId]/tests/[testId]/submit/route';
import { POST as start } from '@/app/api/courses/[courseId]/tests/[testId]/start/route';

const params = { params: Promise.resolve({ courseId: 'c1', testId: 't1' }) };
const student = { userId: 'u1', email: 'u1@example.com', role: 'STUDENT' };

function post(url: string, body?: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

const exam = {
  id: 't1',
  courseId: 'c1',
  title: 'Unit test',
  description: null,
  durationMins: 30,
  passingScore: 50,
  maxAttempts: 1,
  showResults: true,
  shuffleQuestions: false,
  questionsToShow: null,
  availableFrom: null,
  availableUntil: null,
  parts: [],
  questions: [
    { id: 'q1', type: 'SCQ', category: 'CONCEPT', prompt: '1?', options: [], imageUrl: null, order: 0, points: 4, negativeMarks: 0, allowPartialMarking: false, correctAnswer: ['B'], explanation: null },
    { id: 'q2', type: 'SCQ', category: 'CONCEPT', prompt: '2?', options: [], imageUrl: null, order: 1, points: 4, negativeMarks: 0, allowPartialMarking: false, correctAnswer: ['C'], explanation: null },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuth.mockResolvedValue(student);
  mocks.courseRelation.mockResolvedValue('student');
  mocks.courseTestFindFirst.mockResolvedValue(exam);
  mocks.attemptCount.mockResolvedValue(0);
  mocks.attemptUpdate.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
});

describe('POST /tests/[testId]/submit', () => {
  const startedAttempt = { id: 'a1', startedAt: new Date(Date.now() - 90_000), questionOrder: ['q1'] };

  it('refuses students who are not enrolled', async () => {
    mocks.courseRelation.mockResolvedValue('none');
    const res = await submit(post('/submit', { answers: { q1: 'B' } }), params);
    expect(res.status).toBe(403);
    expect(mocks.courseTestFindFirst).not.toHaveBeenCalled();
  });

  it('only lets students submit published tests', async () => {
    mocks.attemptFindFirst.mockResolvedValue(startedAttempt);
    await submit(post('/submit', { answers: { q1: 'B' } }), params);
    expect(mocks.courseTestFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1', courseId: 'c1', status: 'PUBLISHED' } }),
    );
  });

  it('refuses a submission without a started attempt', async () => {
    mocks.attemptFindFirst.mockResolvedValue(null);
    const res = await submit(post('/submit', { answers: { q1: 'B' } }), params);
    expect(res.status).toBe(409);
    expect(mocks.attemptUpdate).not.toHaveBeenCalled();
  });

  it('refuses a submission past the attempt limit, under the lock', async () => {
    mocks.attemptFindFirst.mockResolvedValue(startedAttempt);
    mocks.attemptCount.mockResolvedValueOnce(1);
    const res = await submit(post('/submit', { answers: { q1: 'B' } }), params);
    expect(res.status).toBe(409);
    expect(mocks.lock).toHaveBeenCalled();
    expect(mocks.attemptUpdate).not.toHaveBeenCalled();
  });

  it('grades only the questions the attempt showed and measures time on the server', async () => {
    mocks.attemptFindFirst.mockResolvedValue(startedAttempt);
    const res = await submit(post('/submit', { answers: { q1: 'B', q2: 'A' }, timeSpentSecs: 1 }), params);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toMatchObject({ score: 100, totalPoints: 4, isPassed: true });
    const saved = mocks.attemptUpdate.mock.calls[0][0].data;
    expect(saved.answers).toEqual({ q1: 'B' });
    expect(saved.timeSpentSecs).toBeGreaterThanOrEqual(89);
  });

  it('awards XP for the first pass only', async () => {
    mocks.attemptFindFirst.mockResolvedValue(startedAttempt);
    mocks.attemptCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    await submit(post('/submit', { answers: { q1: 'B' } }), params);
    expect(mocks.userUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { xpPoints: { increment: 40 } } });

    vi.clearAllMocks();
    mocks.attemptFindFirst.mockResolvedValue(startedAttempt);
    mocks.attemptUpdate.mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
    mocks.attemptCount.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    await submit(post('/submit', { answers: { q1: 'B' } }), params);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});

describe('POST /tests/[testId]/start', () => {
  it('refuses students who are not enrolled', async () => {
    mocks.courseRelation.mockResolvedValue('none');
    const res = await start(post('/start'), params);
    expect(res.status).toBe(403);
  });

  it('resumes an unfinished attempt instead of creating another', async () => {
    mocks.attemptFindFirst.mockResolvedValue({ id: 'a1', startedAt: new Date(), questionOrder: ['q2', 'q1'] });
    const res = await start(post('/start'), params);
    const json = await res.json();
    expect(json.data.resumed).toBe(true);
    expect(json.data.questions.map((q: { id: string }) => q.id)).toEqual(['q2', 'q1']);
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it('refuses a new attempt past the limit', async () => {
    mocks.attemptFindFirst.mockResolvedValue(null);
    mocks.attemptCount.mockResolvedValue(1);
    const res = await start(post('/start'), params);
    expect(res.status).toBe(403);
    expect(mocks.attemptCreate).not.toHaveBeenCalled();
  });

  it('creates an attempt and never sends answers', async () => {
    mocks.attemptFindFirst.mockResolvedValue(null);
    mocks.attemptCreate.mockImplementation(async ({ data }) => ({ id: 'a2', startedAt: new Date(), questionOrder: data.questionOrder }));
    const res = await start(post('/start'), params);
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.resumed).toBe(false);
    expect(JSON.stringify(json.data.questions)).not.toContain('correctAnswer');
  });
});
