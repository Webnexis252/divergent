import { describe, it, expect } from 'vitest';
import { checkProductionConfig } from '@/lib/production-config';

const ready = {
  JWT_SECRET: 'x'.repeat(48),
  UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  CRON_SECRET: 'cron',
  NEXT_PUBLIC_APP_URL: 'https://lms.example.com',
  RAZORPAY_KEY_ID: 'rzp_live_abc',
  RAZORPAY_KEY_SECRET: 'secret',
  RAZORPAY_WEBHOOK_SECRET: 'whsec',
  EMAIL_HOST: 'email-smtp.ap-south-1.amazonaws.com',
  EMAIL_USER: 'user',
  EMAIL_PASS: 'pass',
  SENTRY_DSN: 'https://key@o1.ingest.sentry.io/1',
};

const names = (env: Record<string, string | undefined>, level?: string) =>
  checkProductionConfig(env).filter((p) => !level || p.level === level).map((p) => p.name);

describe('checkProductionConfig', () => {
  it('passes a complete production setup', () => {
    expect(checkProductionConfig(ready)).toEqual([]);
  });

  it('flags weak or missing secrets and missing rate limiting as errors', () => {
    expect(names({ ...ready, JWT_SECRET: 'short' }, 'error')).toEqual(['JWT_SECRET']);
    expect(names({ ...ready, CRON_SECRET: undefined }, 'error')).toEqual(['CRON_SECRET']);
    expect(names({ ...ready, UPSTASH_REDIS_REST_TOKEN: '' }, 'error')).toEqual(['UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN']);
  });

  it('catches test-mode payments in production', () => {
    expect(names({ ...ready, RAZORPAY_KEY_ID: 'rzp_test_abc' }, 'error')).toEqual(['RAZORPAY_KEY_ID']);
    expect(names({ ...ready, CASHFREE_APP_ID: 'id', CASHFREE_SECRET_KEY: 's', CASHFREE_ENVIRONMENT: 'SANDBOX' }, 'error')).toEqual([
      'CASHFREE_ENVIRONMENT',
    ]);
  });

  it('warns about Gmail and refuses weekly reports through it', () => {
    expect(names({ ...ready, EMAIL_HOST: 'smtp.gmail.com' })).toEqual(['EMAIL_HOST']);
    expect(names({ ...ready, EMAIL_HOST: 'smtp.gmail.com', WEEKLY_REPORTS_ENABLED: 'true' }, 'error')).toEqual([
      'WEEKLY_REPORTS_ENABLED',
    ]);
  });

  it('catches a half-configured queue', () => {
    expect(names({ ...ready, QSTASH_TOKEN: 'q' }, 'error')).toEqual(['QSTASH_*_SIGNING_KEY']);
  });

  it('never includes secret values in its messages', () => {
    const output = JSON.stringify(checkProductionConfig({ ...ready, JWT_SECRET: 'short-secret-value', RAZORPAY_KEY_ID: 'rzp_test_SECRET123' }));
    expect(output).not.toContain('short-secret-value');
    expect(output).not.toContain('SECRET123');
  });
});
