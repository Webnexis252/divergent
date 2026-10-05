import { expect, test } from '@playwright/test';
import { requireStudentAccount, signIn } from './helpers';

/**
 * Takes a whole exam: start, step through every question, submit.
 * Needs E2E_COURSE_SLUG and E2E_TEST_ID for a published test the E2E student
 * is enrolled in with attempts left. Writes a TestAttempt each run.
 */
const courseSlug = process.env.E2E_COURSE_SLUG;
const testId = process.env.E2E_TEST_ID;

test.describe('exam', () => {
  requireStudentAccount();
  test.skip(!courseSlug || !testId, 'Set E2E_COURSE_SLUG and E2E_TEST_ID to run the exam flow');

  test('student starts, answers and submits a test', async ({ page }) => {
    const testPath = `/dashboard/courses/${courseSlug}/tests/${testId}`;
    await signIn(page, testPath);

    await page.getByRole('button', { name: /start test/i }).click();

    // Step through to the last question
    const next = page.getByRole('button', { name: /^next/i });
    for (let i = 0; i < 200 && (await next.isVisible()); i++) await next.click();

    await page.getByRole('button', { name: /^submit/i }).click();
    const confirm = page.getByRole('button', { name: /go to submit/i });
    if (await confirm.isVisible()) await confirm.click();

    const submitted = page.waitForResponse(
      (res) => res.url().includes(`/tests/${testId}/submit`) && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /submit test/i }).click();
    const submitAnyway = page.getByRole('button', { name: /submit anyway/i });
    if (await submitAnyway.isVisible()) await submitAnyway.click();

    expect((await submitted).ok()).toBe(true);
  });
});
