// @vitest-environment node
/**
 * The phone OTP guess limit against a real Postgres: the atomic attempt claim
 * is what stops parallel brute-forcing, which mocks can't check.
 *
 * Opt-in, like engagement.integration.test.ts: set TEST_DATABASE_URL to a
 * disposable database built with `prisma migrate deploy`.
 */
import * as bcrypt from '@node-rs/bcrypt';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { assertDifferentDatabases, assertWritableDatabase } from '../../../scripts/lib/db-guard.mjs';

// Route helpers read request headers (for compression); outside Next there are none
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const PHONE = '+919876500001';
const CODE = '482913';

describe.skipIf(!TEST_DATABASE_URL)('phone OTP verify (integration)', () => {
  let prisma: PrismaClient;
  let POST: typeof import('@/app/api/auth/phone-otp/verify/route').POST;

  beforeAll(async () => {
    assertDifferentDatabases(TEST_DATABASE_URL, process.env.DATABASE_URL, 'run destructive integration tests');
    assertWritableDatabase(TEST_DATABASE_URL, 'run destructive integration tests');
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    vi.stubEnv('JWT_SECRET', 'test-secret-for-phone-otp-integration');
    prisma = (await import('@/lib/prisma')).default as unknown as PrismaClient;
    ({ POST } = await import('@/app/api/auth/phone-otp/verify/route'));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE "PhoneOtp"');
  });

  const newOtp = async (code: string, createdAt = new Date()) =>
    prisma.phoneOtp.create({
      data: {
        phone: PHONE,
        context: 'SIGNUP',
        otpHash: await bcrypt.hash(code, 4),
        expiresAt: new Date(Date.now() + 10 * 60_000),
        createdAt,
      },
    });

  // A different IP per test keeps the per-IP limiter (10 a minute) out of the way
  let ipSeq = 0;
  const nextIp = () => `10.0.0.${++ipSeq}`;
  const verify = (otp: string, ip: string) =>
    POST(
      new NextRequest('http://localhost/api/auth/phone-otp/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ phone: PHONE, otp, context: 'SIGNUP' }),
      }),
    );

  it('accepts the right code within the limit and uses it up', async () => {
    await newOtp(CODE);
    const ip = nextIp();

    expect((await verify('111111', ip)).status).toBe(400);
    const ok = await verify(CODE, ip);

    expect(ok.status).toBe(200);
    expect((await ok.json()).data.phoneVerifiedToken).toEqual(expect.any(String));
    expect(await prisma.phoneOtp.count()).toBe(0);
  });

  it('locks the code after 5 wrong guesses, even against the right one', async () => {
    await newOtp(CODE);
    const ip = nextIp();

    const statuses = [];
    for (const guess of ['000001', '000002', '000003', '000004', '000005']) {
      statuses.push((await verify(guess, ip)).status);
    }
    expect(statuses).toEqual([400, 400, 400, 400, 429]);

    const locked = await verify(CODE, ip);
    expect(locked.status).toBe(429);
    expect((await locked.json()).error).toMatch(/request a new OTP/);
  });

  it('holds a burst of parallel guesses to the limit', async () => {
    const otp = await newOtp(CODE);
    // 20 guesses from 2 IPs, all at once
    const guesses = Array.from({ length: 20 }, (_, i) => verify(String(100000 + i), i % 2 ? '10.1.0.1' : '10.1.0.2'));
    const statuses = (await Promise.all(guesses)).map((res) => res.status);

    expect(statuses.filter((status) => status === 400 || status === 429).length).toBe(20);
    expect((await prisma.phoneOtp.findUniqueOrThrow({ where: { id: otp.id } })).attempts).toBe(5);
  });

  it("doesn't fall back to an older code once the newest is locked", async () => {
    await newOtp('654321', new Date(Date.now() - 60_000));
    await newOtp(CODE);
    const ip = nextIp();

    for (let i = 0; i < 5; i++) await verify('000000', ip);

    expect((await verify('654321', nextIp())).status).toBe(429);
  });
});
