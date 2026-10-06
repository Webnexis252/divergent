// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ default: {} }));

import { addStudyTime, studyWeek } from '@/lib/study-time';

describe('study week', () => {
  it('starts at Monday 00:00 IST', () => {
    // Wednesday 7 Oct, 12:00 IST
    const { weekStart, startsAt } = studyWeek(new Date('2026-10-07T06:30:00Z'));
    expect(weekStart.toISOString()).toBe('2026-10-05T00:00:00.000Z'); // Mon 5 Oct
    expect(startsAt.toISOString()).toBe('2026-10-04T18:30:00.000Z'); // Mon 5 Oct, 00:00 IST
  });

  it('rolls over on IST midnight, not UTC midnight', () => {
    // Sunday 4 Oct, 23:59 IST: still the previous week
    expect(studyWeek(new Date('2026-10-04T18:29:00Z')).weekStart.toISOString()).toBe(
      '2026-09-28T00:00:00.000Z',
    );
    // Monday 5 Oct, 00:00 IST (still Sunday in UTC): the new week
    expect(studyWeek(new Date('2026-10-04T18:30:00Z')).weekStart.toISOString()).toBe(
      '2026-10-05T00:00:00.000Z',
    );
  });

  it('keeps a Monday in its own week', () => {
    // Monday 5 Oct, 23:00 IST
    expect(studyWeek(new Date('2026-10-05T17:30:00Z')).weekStart.toISOString()).toBe(
      '2026-10-05T00:00:00.000Z',
    );
  });
});

describe('addStudyTime', () => {
  function fakeClient() {
    return {
      user: { update: vi.fn().mockResolvedValue({}) },
      weeklyStudyTime: { upsert: vi.fn().mockResolvedValue({}) },
    };
  }

  it("adds to the lifetime total and to the current week's row", async () => {
    const client = fakeClient();
    await addStudyTime(client as never, 'user_1', 90, new Date('2026-10-07T06:30:00Z'));

    expect(client.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { totalStudyTime: { increment: 90 } },
    });
    const weekStart = new Date('2026-10-05T00:00:00Z');
    expect(client.weeklyStudyTime.upsert).toHaveBeenCalledWith({
      where: { userId_weekStart: { userId: 'user_1', weekStart } },
      create: { userId: 'user_1', weekStart, seconds: 90 },
      update: { seconds: { increment: 90 } },
    });
  });

  it('writes nothing for zero seconds', async () => {
    const client = fakeClient();
    await addStudyTime(client as never, 'user_1', 0);

    expect(client.user.update).not.toHaveBeenCalled();
    expect(client.weeklyStudyTime.upsert).not.toHaveBeenCalled();
  });
});
