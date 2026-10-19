#!/usr/bin/env node
/**
 * Amplify Hosting gives environment variables to the build only, not to the
 * server that answers requests. This copies the server-side settings from the
 * build environment into .env.production, which `next start` / the Amplify
 * compute runtime loads at start-up. Run it in amplify.yml before `npm run build`.
 *
 * Only names in RUNTIME_VARS are copied, so build-only secrets stay out of the
 * bundle. .env.production is git-ignored and lives only in the build output.
 *
 *   node scripts/write-runtime-env.mjs            # writes .env.production
 *   node scripts/write-runtime-env.mjs --check    # lists what would be written
 */
import { writeFileSync } from 'node:fs';

export const RUNTIME_VARS = [
  'APP_ENV',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
  'DATABASE_URL',
  'DATABASE_CONNECTION_LIMIT',
  'DIRECT_URL',
  'JWT_SECRET',
  'CRON_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'CASHFREE_APP_ID',
  'CASHFREE_SECRET_KEY',
  'CASHFREE_ENVIRONMENT',
  'CASHFREE_WEBHOOK_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DAILY_API_KEY',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS',
  'EMAIL_FROM',
  'QSTASH_URL',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
  'INTERAKT_API_KEY',
  'INTERAKT_OTP_TEMPLATE_NAME',
  'INTERAKT_CLASS_REMINDER_TEMPLATE_NAME',
  'WEEKLY_REPORTS_ENABLED',
  'SENTRY_DSN',
  'SENTRY_TRACES_SAMPLE_RATE',
  'DEBUG_LOGS',
];

/**
 * One KEY='value' line in the form @next/env reads back unchanged. Single
 * quotes keep backslashes and `#` literal; `$` still gets variable expansion
 * there, so it is escaped as `\$`.
 */
export function formatEnvLine(name, value) {
  if (/[\r\n']/.test(value)) {
    throw new Error(`${name} contains a newline or single quote, which .env.production cannot hold. Change the value.`);
  }
  return `${name}='${value.replaceAll('$', '\\$')}'`;
}

export function buildRuntimeEnv(env = process.env) {
  const present = RUNTIME_VARS.filter((name) => env[name]?.trim());
  return {
    present,
    contents: present.map((name) => formatEnvLine(name, env[name])).join('\n') + '\n',
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { present, contents } = buildRuntimeEnv();
  const missing = RUNTIME_VARS.filter((name) => !present.includes(name));
  if (!process.argv.includes('--check')) writeFileSync('.env.production', contents, { mode: 0o600 });
  console.log(`[runtime-env] ${process.argv.includes('--check') ? 'would write' : 'wrote'} ${present.length} variables to .env.production: ${present.join(', ')}`);
  if (missing.length) console.log(`[runtime-env] not set (skipped): ${missing.join(', ')}`);
}
