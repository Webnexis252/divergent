// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({ default: {} }));
vi.mock('@/lib/email', () => ({ sendWeeklyReportEmail: vi.fn() }));

import {
  isValidUnsubscribeToken,
  reportWeekEnding,
  reportWindow,
  unsubscribeToken,
  unsubscribeUrl,
} from '@/lib/weekly-reports';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('JWT_SECRET', 'test-secret');
  vi.stubEnv('APP_URL', 'https://lms.example.com');
});

describe('weekly report window', () => {
  it('uses the IST date the cron runs on', () => {
    // Sunday 13:30 UTC is 19:00 IST the same day
    expect(reportWeekEnding(new Date('2026-10-04T13:30:00Z'))).toBe('2026-10-04');
    // 20:00 UTC Sunday is already Monday in IST
    expect(reportWeekEnding(new Date('2026-10-04T20:00:00Z'))).toBe('2026-10-05');
  });

  it('covers the seven IST days ending with weekEnding', () => {
    const { start, end, label } = reportWindow('2026-10-04');
    expect(start.toISOString()).toBe('2026-09-27T18:30:00.000Z'); // Mon 28 Sep, 00:00 IST
    expect(end.toISOString()).toBe('2026-10-04T18:30:00.000Z'); // Mon 5 Oct, 00:00 IST
    expect(label).toBe('28 Sept – 4 Oct');
  });
});

describe('unsubscribe links', () => {
  it('validate only for the user they were made for', () => {
    const token = unsubscribeToken('user_1');
    expect(isValidUnsubscribeToken('user_1', token)).toBe(true);
    expect(isValidUnsubscribeToken('user_2', token)).toBe(false);
    expect(isValidUnsubscribeToken('user_1', token.replace(/^./, '0'))).toBe(token.startsWith('0'));
  });

  it('point at the unsubscribe route', () => {
    expect(unsubscribeUrl('user_1')).toBe(
      `https://lms.example.com/api/reports/unsubscribe?u=user_1&t=${unsubscribeToken('user_1')}`,
    );
  });
});
