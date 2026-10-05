// @vitest-environment node
import crypto from 'crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  after: vi.fn(),
  notifyBatch: vi.fn(),
  reminderBatch: vi.fn(),
  reportBatch: vi.fn(),
}));

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: mocks.after,
}));
vi.mock('@/lib/prisma', () => ({ default: {} }));
vi.mock('@/lib/course-notifications', () => ({ notifyCourseStudentsBatch: mocks.notifyBatch }));
vi.mock('@/lib/class-reminders', () => ({ sendClassReminderBatch: mocks.reminderBatch }));
vi.mock('@/lib/weekly-reports', () => ({ sendWeeklyReportBatch: mocks.reportBatch }));

import { enqueueJob, verifyQStashSignature } from '@/lib/jobs';
import { runJobStep, runJobToCompletion } from '@/lib/job-handlers';

const CURRENT = 'sig_current_key';
const NEXT = 'sig_next_key';
const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function qstashToken(
  body: string,
  { key = CURRENT, sub = 'https://lms.example.com/api/jobs/course-notify', exp = 2_000_000_000, iss = 'Upstash' } = {},
) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const claims = { iss, sub, exp, nbf: 1_600_000_000, iat: 1_600_000_000, body: b64url(crypto.createHash('sha256').update(body).digest()) };
  const payload = b64url(Buffer.from(JSON.stringify(claims)));
  const signature = b64url(crypto.createHmac('sha256', key).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${signature}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv('QSTASH_CURRENT_SIGNING_KEY', CURRENT);
  vi.stubEnv('QSTASH_NEXT_SIGNING_KEY', NEXT);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

describe('verifyQStashSignature', () => {
  const body = JSON.stringify({ courseId: 'c1' });
  const path = '/api/jobs/course-notify';
  const now = 1_700_000_000_000;

  it('accepts a token signed with the current or next key', () => {
    expect(verifyQStashSignature(qstashToken(body), body, path, now)).toBe(true);
    expect(verifyQStashSignature(qstashToken(body, { key: NEXT }), body, path, now)).toBe(true);
  });

  it('rejects other keys, a changed body, another path, a wrong issuer, or an expired token', () => {
    expect(verifyQStashSignature(qstashToken(body, { key: 'attacker' }), body, path, now)).toBe(false);
    expect(verifyQStashSignature(qstashToken(body), body.replace('c1', 'c2'), path, now)).toBe(false);
    expect(verifyQStashSignature(qstashToken(body), body, '/api/jobs/weekly-reports', now)).toBe(false);
    expect(verifyQStashSignature(qstashToken(body, { iss: 'Someone' }), body, path, now)).toBe(false);
    expect(verifyQStashSignature(qstashToken(body, { exp: 1_600_000_000 }), body, path, now)).toBe(false);
  });

  it('rejects everything when no signing key is configured', () => {
    vi.stubEnv('QSTASH_CURRENT_SIGNING_KEY', '');
    vi.stubEnv('QSTASH_NEXT_SIGNING_KEY', '');
    expect(verifyQStashSignature(qstashToken(body), body, path, now)).toBe(false);
    expect(verifyQStashSignature(null, body, path, now)).toBe(false);
  });
});

describe('enqueueJob', () => {
  it('publishes to QStash with retries when it is configured', async () => {
    vi.stubEnv('QSTASH_TOKEN', 'qstash_token');
    vi.stubEnv('APP_URL', 'https://lms.example.com/');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await enqueueJob('class-reminders', { liveClassId: 'lc1' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://qstash.upstash.io/v2/publish/https://lms.example.com/api/jobs/class-reminders');
    expect(init.headers.Authorization).toBe('Bearer qstash_token');
    expect(init.headers['Upstash-Retries']).toBe('5');
    expect(JSON.parse(init.body)).toEqual({ liveClassId: 'lc1' });
    expect(mocks.after).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('falls back to running after the response without QStash', async () => {
    vi.stubEnv('QSTASH_TOKEN', '');
    await enqueueJob('course-notify', { courseId: 'c1', content: { title: 't', body: 'b' } });
    expect(mocks.after).toHaveBeenCalledTimes(1);
  });
});

describe('job handlers', () => {
  it('runs every batch in fallback mode', async () => {
    mocks.notifyBatch
      .mockResolvedValueOnce({ created: 2000, nextCursor: 'e2000' })
      .mockResolvedValueOnce({ created: 2000, nextCursor: 'e4000' })
      .mockResolvedValueOnce({ created: 12, nextCursor: null });

    await runJobToCompletion('course-notify', { courseId: 'c1', content: { title: 't', body: 'b' } });

    expect(mocks.notifyBatch.mock.calls.map((c) => c[2])).toEqual([undefined, 'e2000', 'e4000']);
  });

  it('runs one batch and queues the next in queue mode', async () => {
    vi.stubEnv('QSTASH_TOKEN', 'qstash_token');
    vi.stubEnv('APP_URL', 'https://lms.example.com');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    mocks.reportBatch.mockResolvedValueOnce({ sent: 200, failed: 0, nextCursor: 'u200' });

    await runJobStep('weekly-reports', { weekEnding: '2026-10-04' });

    expect(mocks.reportBatch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ weekEnding: '2026-10-04', cursor: 'u200' });
    vi.unstubAllGlobals();
  });

  it('stops when the last batch is done', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mocks.reminderBatch.mockResolvedValueOnce({ sent: 3, failed: 0, nextCursor: null });

    await runJobStep('class-reminders', { liveClassId: 'lc1' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.after).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
