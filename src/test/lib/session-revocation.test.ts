// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const redisMock = vi.hoisted(() => ({ mget: vi.fn(), set: vi.fn() }));
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(function Redis() {
    return redisMock;
  }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
const prismaMock = vi.hoisted(() => ({ update: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ default: { user: { update: prismaMock.update } } }));

// auth.ts reads JWT_SECRET when it is first imported, before any test runs
vi.hoisted(() => {
  process.env.JWT_SECRET = 'a'.repeat(48);
});

import { AUTH_COOKIE_NAME, signToken, verifyTokenValue } from '@/lib/auth';
import {
  isTokenRevoked,
  resetSessionRevocationForTests,
  revokeAllSessions,
  revokeToken,
} from '@/lib/session-revocation';
import { POST as logout } from '@/app/api/auth/logout/route';
import { PATCH as changePassword } from '@/app/api/users/me/password/route';
import { proxy } from '@/proxy';

const student = { userId: 'user_1', email: 's@example.test', role: 'STUDENT' as const };
const withCookie = (url: string, token: string, init: { method?: string; body?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(url, { ...init, headers: { cookie: `${AUTH_COOKIE_NAME}=${token}`, ...init.headers } });

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('JWT_SECRET', 'a'.repeat(48));
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  resetSessionRevocationForTests();
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('session revocation', () => {
  it('logging out revokes that token only', async () => {
    const thisDevice = await signToken(student);
    const otherDevice = await signToken(student);

    const res = await logout(withCookie('http://localhost/api/auth/logout', thisDevice, { method: 'POST' }));

    expect(res.status).toBe(200);
    expect(await verifyTokenValue(thisDevice)).toBeNull();
    expect(await verifyTokenValue(otherDevice)).toMatchObject({ userId: 'user_1' });
  });

  it('revoking all sessions rejects tokens issued earlier but keeps later ones', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T10:00:00Z'));
    const stolen = await signToken(student);

    vi.setSystemTime(new Date('2026-10-05T10:05:00Z'));
    await revokeAllSessions('user_1');
    const fresh = await signToken(student);

    expect(await verifyTokenValue(stolen)).toBeNull();
    expect(await verifyTokenValue(fresh)).toMatchObject({ userId: 'user_1' });
    // Other users are unaffected
    expect(await isTokenRevoked({ userId: 'user_2', iat: 1 })).toBe(false);
  });

  it('a password change signs out other devices and keeps this one signed in', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-05T10:00:00Z'));
    const otherDevice = await signToken(student);
    const thisDevice = await signToken(student);
    vi.setSystemTime(new Date('2026-10-05T11:00:00Z'));
    prismaMock.update.mockResolvedValue({});

    const res = await changePassword(
      withCookie('http://localhost/api/users/me/password', thisDevice, {
        method: 'PATCH',
        body: JSON.stringify({ password: 'NewPassword1' }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    expect(res.status).toBe(200);
    const replacement = res.cookies.get(AUTH_COOKIE_NAME)?.value;
    expect(replacement).toBeTruthy();
    expect(await verifyTokenValue(replacement)).toMatchObject({ userId: 'user_1' });
    expect(await verifyTokenValue(otherDevice)).toBeNull();
    expect(await verifyTokenValue(thisDevice)).toBeNull();
  });

  it('the proxy treats a revoked token as signed out', async () => {
    const token = await signToken(student);
    const before = await proxy(withCookie('http://localhost/dashboard/live-classes', token));
    expect(before.headers.get('location')).toBeNull();

    await revokeAllSessions('user_1', Date.now() + 1000);
    const after = await proxy(withCookie('http://localhost/dashboard/live-classes', token));
    expect(after.headers.get('location')).toMatch(/\/login\?callbackUrl=%2Fdashboard%2Flive-classes/);
  });

  it('uses Redis when configured and accepts tokens if Redis is down', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    resetSessionRevocationForTests();
    const token = await signToken(student);

    redisMock.mget.mockResolvedValueOnce([null, 1]);
    expect(await verifyTokenValue(token)).toBeNull();
    expect(redisMock.mget).toHaveBeenCalledWith('auth:revoked-before:user_1', expect.stringMatching(/^auth:revoked-token:/));

    resetSessionRevocationForTests();
    redisMock.mget.mockRejectedValueOnce(new Error('Upstash unreachable'));
    expect(await verifyTokenValue(token)).toMatchObject({ userId: 'user_1' });
  });

  it('caches lookups so a busy user costs one Redis call per 30 seconds', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    resetSessionRevocationForTests();
    redisMock.mget.mockResolvedValue([null, null]);
    const token = await signToken(student);

    for (let i = 0; i < 5; i++) await verifyTokenValue(token);

    expect(redisMock.mget).toHaveBeenCalledTimes(1);
  });

  it('revokes a token until it would have expired anyway', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
    resetSessionRevocationForTests();
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    await revokeToken('jti_1', expiresAt);

    expect(redisMock.set).toHaveBeenCalledWith('auth:revoked-token:jti_1', 1, { ex: expect.any(Number) });
    const ttl = redisMock.set.mock.calls[0][2].ex;
    expect(ttl).toBeGreaterThan(3590);
    expect(ttl).toBeLessThanOrEqual(3600);
  });
});
