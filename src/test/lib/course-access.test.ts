// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  courseCount: vi.fn(),
  enrollmentFindUnique: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    course: { count: mocks.courseCount },
    enrollment: { findUnique: mocks.enrollmentFindUnique },
  },
}));

import { canManageCourse, courseRelation, enrollmentGrantsAccess } from '@/lib/course-access';

const NOW = new Date('2026-10-17T10:00:00Z');

describe('enrollmentGrantsAccess', () => {
  const active = { status: 'ACTIVE', isInstallmentBased: false, validUntil: null };

  it('allows active and completed enrollments', () => {
    expect(enrollmentGrantsAccess(active, NOW)).toBe(true);
    expect(enrollmentGrantsAccess({ ...active, status: 'COMPLETED' }, NOW)).toBe(true);
  });

  it('refuses no enrollment, paused and cancelled ones', () => {
    expect(enrollmentGrantsAccess(null, NOW)).toBe(false);
    expect(enrollmentGrantsAccess({ ...active, status: 'PAUSED' }, NOW)).toBe(false);
    expect(enrollmentGrantsAccess({ ...active, status: 'CANCELLED' }, NOW)).toBe(false);
  });

  it('refuses an installment enrollment whose paid-up period has ended', () => {
    const installment = { status: 'ACTIVE', isInstallmentBased: true, validUntil: new Date('2026-10-01') };
    expect(enrollmentGrantsAccess(installment, NOW)).toBe(false);
    expect(enrollmentGrantsAccess({ ...installment, validUntil: new Date('2026-11-01') }, NOW)).toBe(true);
  });
});

describe('canManageCourse', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lets admins manage any course without a lookup', async () => {
    expect(await canManageCourse({ userId: 'a', role: 'ADMIN' }, 'c1')).toBe(true);
    expect(await canManageCourse({ userId: 's', role: 'SUPER_ADMIN' }, null)).toBe(true);
    expect(mocks.courseCount).not.toHaveBeenCalled();
  });

  it('lets a teacher manage only courses they teach', async () => {
    mocks.courseCount.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    expect(await canManageCourse({ userId: 't', role: 'MENTOR' }, 'mine')).toBe(true);
    expect(await canManageCourse({ userId: 't', role: 'MENTOR' }, 'theirs')).toBe(false);
    expect(mocks.courseCount).toHaveBeenCalledWith({ where: { id: 'mine', teachers: { some: { id: 't' } } } });
  });

  it("keeps teachers out of content that belongs to no course, and students out of everything", async () => {
    expect(await canManageCourse({ userId: 't', role: 'MENTOR' }, null)).toBe(false);
    expect(await canManageCourse({ userId: 's', role: 'STUDENT' }, 'c1')).toBe(false);
    expect(mocks.courseCount).not.toHaveBeenCalled();
  });
});

describe('courseRelation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('tells managers, enrolled students and outsiders apart', async () => {
    mocks.enrollmentFindUnique.mockResolvedValueOnce({ status: 'ACTIVE', isInstallmentBased: false, validUntil: null });
    expect(await courseRelation({ userId: 's', role: 'STUDENT' }, 'c1')).toBe('student');

    mocks.enrollmentFindUnique.mockResolvedValueOnce(null);
    expect(await courseRelation({ userId: 's', role: 'STUDENT' }, 'c1')).toBe('none');

    expect(await courseRelation({ userId: 'a', role: 'ADMIN' }, 'c1')).toBe('manager');
  });
});
