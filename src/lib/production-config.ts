/**
 * Checks the deployment's environment variables for settings that are missing
 * or unsafe in production. Reports variable names only, never their values.
 *
 * Run at server start (src/instrumentation.ts logs problems to the Vercel
 * logs) and on demand via GET /api/health/config with the cron secret.
 */

export type ConfigCheck = {
  name: string;
  level: 'error' | 'warning';
  message: string;
};

type Env = Record<string, string | undefined>;

const set = (env: Env, key: string) => Boolean(env[key]?.trim());

export function checkProductionConfig(env: Env = process.env): ConfigCheck[] {
  const problems: ConfigCheck[] = [];
  const add = (name: string, level: ConfigCheck['level'], message: string) => problems.push({ name, level, message });

  // ── Auth ──
  if (!set(env, 'JWT_SECRET')) {
    add('JWT_SECRET', 'error', 'Not set: sign-in cannot work.');
  } else if ((env.JWT_SECRET ?? '').length < 32) {
    add('JWT_SECRET', 'error', 'Shorter than 32 characters: session tokens could be brute-forced. Use a long random value.');
  }

  // ── Rate limiting ──
  if (!set(env, 'UPSTASH_REDIS_REST_URL') || !set(env, 'UPSTASH_REDIS_REST_TOKEN')) {
    add(
      'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN',
      'error',
      'Not set: rate limits fall back to per-instance memory, so sign-in brute-force protection barely works on serverless.',
    );
  }

  // ── Crons ──
  if (!set(env, 'CRON_SECRET')) {
    add('CRON_SECRET', 'error', 'Not set: payment reconciliation and the other crons refuse to run.');
  }

  // ── App URL (links in emails, job callbacks) ──
  const appUrl = env.APP_URL ?? env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    add('NEXT_PUBLIC_APP_URL', 'error', 'Not set: links in emails point at localhost.');
  } else if (!appUrl.startsWith('https://')) {
    add('NEXT_PUBLIC_APP_URL', 'warning', 'Not an https:// URL.');
  }

  // ── Payments ──
  const cashfree = set(env, 'CASHFREE_APP_ID') && set(env, 'CASHFREE_SECRET_KEY');
  const razorpay = set(env, 'RAZORPAY_KEY_ID') && set(env, 'RAZORPAY_KEY_SECRET');
  if (!cashfree && !razorpay) {
    add('CASHFREE_* / RAZORPAY_*', 'error', 'No payment gateway configured: students cannot buy courses.');
  }
  if (cashfree && env.CASHFREE_ENVIRONMENT !== 'PRODUCTION') {
    add('CASHFREE_ENVIRONMENT', 'error', 'Cashfree is in sandbox mode: payments are not real.');
  }
  if (razorpay && env.RAZORPAY_KEY_ID?.startsWith('rzp_test_')) {
    add('RAZORPAY_KEY_ID', 'error', 'Razorpay test key: payments are not real.');
  }
  if (razorpay && !set(env, 'RAZORPAY_WEBHOOK_SECRET')) {
    add(
      'RAZORPAY_WEBHOOK_SECRET',
      'warning',
      'Not set: Razorpay payments complete only when the browser confirms them (or at the nightly reconciliation).',
    );
  }

  // ── Email ──
  if (!set(env, 'EMAIL_USER') || !set(env, 'EMAIL_PASS')) {
    add('EMAIL_USER / EMAIL_PASS', 'error', 'Not set: sign-up confirmation and teacher emails cannot be sent.');
  }
  const gmail = (env.EMAIL_HOST ?? 'smtp.gmail.com').includes('gmail.com');
  if (gmail) {
    add('EMAIL_HOST', 'warning', 'Gmail SMTP stops at about 2,000 emails a day. Move to a bulk provider (SES, Postmark, Resend) before scaling.');
  }
  if (gmail && env.WEEKLY_REPORTS_ENABLED === 'true') {
    add('WEEKLY_REPORTS_ENABLED', 'error', 'Weekly reports are on but email goes through Gmail, which will block the run part-way.');
  }

  // ── Background jobs ──
  if (set(env, 'QSTASH_TOKEN')) {
    if (!set(env, 'QSTASH_CURRENT_SIGNING_KEY') || !set(env, 'QSTASH_NEXT_SIGNING_KEY')) {
      add('QSTASH_*_SIGNING_KEY', 'error', 'QStash is on but signing keys are missing: every job call will be rejected.');
    }
    if (!appUrl) add('APP_URL', 'error', 'QStash is on but no app URL is set: jobs run in-process without retries.');
  }

  // ── WhatsApp ──
  if (set(env, 'INTERAKT_CLASS_REMINDER_TEMPLATE_NAME') && !set(env, 'INTERAKT_API_KEY')) {
    add('INTERAKT_API_KEY', 'error', 'Class reminders are configured but Interakt has no API key.');
  }

  // ── Monitoring ──
  if (!set(env, 'SENTRY_DSN')) {
    add('SENTRY_DSN', 'warning', 'Not set: server errors are not reported anywhere but the Vercel logs.');
  }

  return problems;
}

/** Only the production deployment is held to these rules (not previews or local dev). */
export function isProductionDeployment(env: Env = process.env): boolean {
  return env.VERCEL_ENV === 'production';
}
