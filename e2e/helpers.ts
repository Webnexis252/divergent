import { expect, test, type Page } from '@playwright/test';

export const student = {
  email: process.env.E2E_STUDENT_EMAIL ?? '',
  password: process.env.E2E_STUDENT_PASSWORD ?? '',
};

/** Skips signed-in tests unless they target a confirmed non-production deployment. */
export function requireStudentAccount() {
  test.skip(
    process.env.E2E_NOT_PRODUCTION !== 'yes' || !student.email || !student.password,
    'Set E2E_NOT_PRODUCTION=yes, E2E_STUDENT_EMAIL and E2E_STUDENT_PASSWORD to run signed-in tests',
  );
}

export async function signIn(page: Page, callbackPath = '/dashboard') {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  await page.getByPlaceholder('you@example.com').fill(student.email);
  await page.getByPlaceholder('Enter your password').fill(student.password);
  await page.getByRole('button', { name: /enter student workspace/i }).click();
  await expect(page).toHaveURL(new RegExp(callbackPath.replace(/\//g, '\\/')), { timeout: 20_000 });
}
