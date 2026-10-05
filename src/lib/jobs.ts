import crypto from 'crypto';
import { after } from 'next/server';
import { safeEqual } from '@/lib/secure-compare';
import type { CourseNotificationContent } from '@/lib/course-notifications';

/**
 * Background jobs that must not be lost.
 *
 * With QStash configured (QSTASH_TOKEN plus APP_URL), each job is published to
 * Upstash QStash, which calls POST /api/jobs/<name> and retries with backoff
 * until it succeeds. Big jobs run one batch per call and enqueue the next batch,
 * so no single function invocation has to finish thousands of writes before
 * Vercel's time limit.
 *
 * Without QStash the job runs after the response (Next.js `after`), all
 * batches in one go: the previous behaviour, with no retries.
 */
export type JobPayloads = {
  /** Notify every active student of a course; `cursor` resumes after that enrollment id. */
  'course-notify': { courseId: string; content: CourseNotificationContent; cursor?: string };
  /** Email weekly progress reports; `cursor` resumes after that user id. */
  'weekly-reports': { cursor?: string; weekEnding: string };
  /** WhatsApp reminders for one live class; `cursor` resumes after that user id. */
  'class-reminders': { liveClassId: string; cursor?: string };
};

export type JobName = keyof JobPayloads;

export const JOB_NAMES: readonly JobName[] = ['course-notify', 'weekly-reports', 'class-reminders'];

export function isJobName(name: string): name is JobName {
  return (JOB_NAMES as readonly string[]).includes(name);
}

function appBaseUrl(): string | null {
  const url = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return url ? url.replace(/\/$/, '') : null;
}

export function isQueueConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && appBaseUrl());
}

export async function enqueueJob<K extends JobName>(name: K, payload: JobPayloads[K]): Promise<void> {
  const base = appBaseUrl();
  if (process.env.QSTASH_TOKEN && base) {
    const qstash = (process.env.QSTASH_URL ?? 'https://qstash.upstash.io').replace(/\/$/, '');
    const res = await fetch(`${qstash}/v2/publish/${base}/api/jobs/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
        'Content-Type': 'application/json',
        'Upstash-Retries': '5',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`[JOBS] QStash publish failed for ${name}: ${res.status} ${await res.text()}`);
    return;
  }

  after(async () => {
    try {
      const { runJobToCompletion } = await import('@/lib/job-handlers');
      await runJobToCompletion(name, payload);
    } catch (err) {
      console.error(`[JOBS] ${name} failed`, err);
    }
  });
}

function base64UrlDecode(part: string): Buffer {
  return Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Checks QStash's `Upstash-Signature` header: an HS256 JWT signed with the
 * current or next signing key, carrying the SHA-256 of the body. Rejects
 * anything not from QStash, so /api/jobs can't be triggered by outsiders.
 */
export function verifyQStashSignature(
  token: string | null,
  rawBody: string,
  expectedPath: string,
  now = Date.now(),
): boolean {
  const keys = [process.env.QSTASH_CURRENT_SIGNING_KEY, process.env.QSTASH_NEXT_SIGNING_KEY].filter(
    (key): key is string => Boolean(key),
  );
  if (!token || keys.length === 0) return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;

  const signedWith = keys.some((key) =>
    safeEqual(signature, base64UrlEncode(crypto.createHmac('sha256', key).update(`${header}.${payload}`).digest())),
  );
  if (!signedWith) return false;

  let claims: { iss?: string; sub?: string; exp?: number; nbf?: number; body?: string };
  try {
    claims = JSON.parse(base64UrlDecode(payload).toString('utf8'));
  } catch {
    return false;
  }

  const seconds = Math.floor(now / 1000);
  const toleranceSecs = 60;
  if (claims.iss !== 'Upstash') return false;
  if (typeof claims.exp === 'number' && seconds > claims.exp + toleranceSecs) return false;
  if (typeof claims.nbf === 'number' && seconds < claims.nbf - toleranceSecs) return false;

  // `sub` is the URL QStash called; compare paths so a proxy's host rewrite doesn't matter
  try {
    if (!claims.sub || new URL(claims.sub).pathname !== expectedPath) return false;
  } catch {
    return false;
  }

  const bodyHash = base64UrlEncode(crypto.createHash('sha256').update(rawBody).digest());
  return safeEqual((claims.body ?? '').replace(/=+$/, ''), bodyHash);
}
