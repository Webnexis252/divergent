import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for the flows that make money: sign-in, the student
 * dashboard pages, and taking an exam. Files are *.e2e.ts so Vitest ignores them.
 *
 *   npx playwright test                      # public pages against E2E_BASE_URL
 *   E2E_BASE_URL=https://staging.example.com E2E_NOT_PRODUCTION=yes \
 *   E2E_STUDENT_EMAIL=... E2E_STUDENT_PASSWORD=... npx playwright test
 *
 * Signed-in tests write data (exam attempts), so they only run against a
 * deployment with its own database, confirmed with E2E_NOT_PRODUCTION=yes.
 * Nothing here starts a dev server: the local .env points at production.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
