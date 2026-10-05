import { expect, test } from '@playwright/test';
import { requireStudentAccount, signIn } from './helpers';

test.describe('signed-in student', () => {
  requireStudentAccount();

  test('lands on the dashboard after signing in', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('sees the live classes schedule', async ({ page }) => {
    await signIn(page, '/dashboard/live-classes');
    await expect(page.getByRole('heading', { name: 'Live Classes', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upcoming Classes' })).toBeVisible();
  });

  test('opens the community feed and its composer', async ({ page }) => {
    await signIn(page, '/dashboard/community');
    await expect(page.getByRole('textbox', { name: 'Message' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Subject' })).toBeVisible();
  });
});
