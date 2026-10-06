import { describe, it, expect } from 'vitest';
import { groupByMonth, type TestItem } from '@/app/dashboard/tests/TestsView';

const NOW = Date.parse('2026-10-05T06:30:00Z'); // Monday 5 Oct 2026, 12:00 IST

function test(id: string, publishedAt: string, extra: Partial<TestItem> = {}): TestItem {
  return {
    id,
    title: id,
    description: null,
    durationMins: 30,
    questionCount: 5,
    availableFrom: null,
    availableUntil: null,
    publishedAt: new Date(publishedAt),
    courseId: 'c1',
    courseTitle: 'Course',
    courseSlug: 'course',
    state: 'done',
    result: { score: 80, isPassed: true, pendingReview: false },
    ...extra,
  };
}

const summary = (tests: TestItem[]) =>
  groupByMonth(tests, NOW).map((month) => [month.label, month.tests.map((t) => t.id)]);

describe('groupByMonth', () => {
  it('lists months newest first and tests newest first within each month', () => {
    const tests = [
      test('jan-early', '2026-01-03T05:00:00Z'),
      test('jun-late', '2026-06-28T05:00:00Z'),
      test('jan-late', '2026-01-25T05:00:00Z'),
      test('jun-early', '2026-06-02T05:00:00Z'),
    ];
    expect(summary(tests)).toEqual([
      ['June 2026', ['jun-late', 'jun-early']],
      ['January 2026', ['jan-late', 'jan-early']],
    ]);
  });

  it('files a test under its start date when it has one, not when it was published', () => {
    const scheduled = test('scheduled', '2026-01-10T05:00:00Z', {
      availableFrom: new Date('2026-06-15T05:00:00Z'),
    });
    expect(summary([scheduled, test('june', '2026-06-01T05:00:00Z')])).toEqual([
      ['June 2026', ['scheduled', 'june']],
    ]);
  });

  it('ignores a start date earlier than publishing', () => {
    // Start date left at 1 January, published in June: students first had it in June
    const placeholder = test('placeholder', '2026-06-10T05:00:00Z', {
      availableFrom: new Date('2025-12-31T18:30:00Z'),
    });
    expect(summary([placeholder])).toEqual([['June 2026', ['placeholder']]]);
  });

  it('uses IST month boundaries, not UTC', () => {
    // Published 31 Jan 19:00 UTC, which is already 1 Feb, 00:30 in IST
    expect(summary([test('midnight', '2026-01-31T19:00:00Z')])).toEqual([['February 2026', ['midnight']]]);
  });

  it('opens the current month and months with a test to take, and only those', () => {
    const months = groupByMonth(
      [
        test('this-month', '2026-10-01T05:00:00Z'),
        test('open', '2026-06-01T05:00:00Z', { state: 'available', result: null }),
        test('old', '2026-01-01T05:00:00Z'),
      ],
      NOW,
    );
    expect(months.map((month) => [month.label, month.open])).toEqual([
      ['October 2026', true],
      ['June 2026', true],
      ['January 2026', false],
    ]);
  });

  it('opens the newest month when nothing else qualifies', () => {
    const months = groupByMonth([test('a', '2026-03-01T05:00:00Z'), test('b', '2026-01-01T05:00:00Z')], NOW);
    expect(months.map((month) => month.open)).toEqual([true, false]);
  });
});
