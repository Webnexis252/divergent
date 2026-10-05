import type { Instrumentation } from 'next';

/**
 * Server-side error tracking with Sentry, off unless SENTRY_DSN is set.
 * The SDK is imported only when configured, so it costs nothing otherwise.
 *
 *   SENTRY_DSN                  — project DSN from sentry.io
 *   SENTRY_TRACES_SAMPLE_RATE   — share of requests traced for performance (default 0)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await reportConfigProblems();

  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME !== 'nodejs' && process.env.NEXT_RUNTIME !== 'edge') return;

  const Sentry = await import('@sentry/nextjs');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // Student data stays out of error reports. Sentry 11 collects cookies,
    // headers, query strings and request bodies by default; turn all of it off.
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};

/**
 * Logs missing or unsafe production settings once per server start, so they
 * show up in the Vercel logs (names only, never values). See
 * src/lib/production-config.ts; GET /api/health/config returns the same list.
 */
async function reportConfigProblems() {
  const { checkProductionConfig, isProductionDeployment } = await import('@/lib/production-config');
  if (!isProductionDeployment()) return;
  for (const problem of checkProductionConfig()) {
    const line = `[CONFIG] ${problem.name}: ${problem.message}`;
    if (problem.level === 'error') console.error(line);
    else console.warn(line);
  }
}

