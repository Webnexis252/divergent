// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  canManageCourse: vi.fn(),
  courseTestFindMany: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/course-access', () => ({ canManageCourse: mocks.canManageCourse }));
vi.mock('@/lib/prisma', () => ({ default: { courseTest: { findMany: mocks.courseTestFindMany } } }));

import { GET } from '@/app/api/teacher/question-stats/[courseId]/route';

const params = { params: Promise.resolve({ courseId: 'c1' }) };
const teacher = { userId: 'm1', email: 'm1@example.com', role: 'MENTOR' };
const request = () => new NextRequest('http://localhost/api/teacher/question-stats/c1');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAuth.mockResolvedValue(teacher);
  mocks.canManageCourse.mockResolvedValue(true);
  mocks.courseTestFindMany.mockResolvedValue([]);
});

describe('GET /api/teacher/question-stats/[courseId]', () => {
  it('turns away users who are not teachers or admins', async () => {
    mocks.requireAuth.mockResolvedValue(null);
    const res = await GET(request(), params);
    expect(res.status).toBe(403);
    expect(mocks.requireAuth).toHaveBeenCalledWith(expect.anything(), ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    expect(mocks.courseTestFindMany).not.toHaveBeenCalled();
  });

  it("turns away a teacher who doesn't teach the course", async () => {
    mocks.canManageCourse.mockResolvedValue(false);
    const res = await GET(request(), params);
    expect(res.status).toBe(403);
    expect(mocks.canManageCourse).toHaveBeenCalledWith(teacher, 'c1');
    expect(mocks.courseTestFindMany).not.toHaveBeenCalled();
  });

  it("returns the course's tests that have stats", async () => {
    mocks.courseTestFindMany.mockResolvedValue([
      {
        id: 't1',
        title: 'Unit test',
        questions: [{ id: 'q1', prompt: 'What is 2 + 2?', type: 'SCQ', imageUrl: null }],
        questionStats: [
          {
            questionId: 'q1',
            studentCount: 25,
            answeredCount: 25,
            correctCount: 5,
            pendingCount: 0,
            difficulty: 0.2,
            discrimination: -0.3,
            answerCounts: [{ answer: '4', count: 5, isCorrect: true }, { answer: '5', count: 20, isCorrect: false }],
            flags: ['NEGATIVE_DISCRIMINATION', 'TOP_STUDENTS_DISAGREE', 'TOO_HARD'],
            computedAt: new Date('2026-10-20T20:30:00Z'),
          },
        ],
      },
    ]);

    const res = await GET(request(), params);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(mocks.courseTestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { courseId: 'c1', questionStats: { some: {} } } }),
    );
    expect(body.data.tests).toHaveLength(1);
    expect(body.data.tests[0]).toMatchObject({ testId: 't1', flaggedCount: 1, studentCount: 25 });
    expect(body.data.tests[0].questions[0]).toMatchObject({ number: 1, prompt: 'What is 2 + 2?' });
  });
});
