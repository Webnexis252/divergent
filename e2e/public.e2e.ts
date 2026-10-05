import { expect, test } from '@playwright/test';

test.describe('sign-in page', () => {
  test('renders the student sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible();
    await expect(page.getByRole('button', { name: /enter student workspace/i })).toBeVisible();
  });

  test('rejects a wrong password without revealing whether the account exists', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('e2e-nobody@example.test');
    await page.getByPlaceholder('Enter your password').fill('not-the-password-123');
    await page.getByRole('button', { name: /enter student workspace/i }).click();
    // Generous wait: on a cold dev server the login API compiles on first use
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('sends signed-out visitors from the dashboard to sign-in', async ({ page }) => {
    await page.goto('/dashboard/live-classes');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard%2Flive-classes/);
  });
});
