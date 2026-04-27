import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

function makeReq(ip = '1.2.3.4') {
  return {
    headers: {
      get(name: string) {
        if (name === 'x-forwarded-for') return ip;
        return null;
      },
    },
  };
}

describe('checkRateLimit', () => {
  it('allows requests within the limit', () => {
    const req = makeReq('10.0.0.1');
    const opts = { limit: 5, windowMs: 60_000 };

    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(req, opts);
      expect(result.success).toBe(true);
    }
  });

  it('blocks requests exceeding the limit', () => {
    const req = makeReq('10.0.0.2');
    const opts = { limit: 3, windowMs: 60_000 };

    checkRateLimit(req, opts); // 1
    checkRateLimit(req, opts); // 2
    checkRateLimit(req, opts); // 3 — limit reached
    const result = checkRateLimit(req, opts); // 4 — over limit

    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('counts remaining correctly', () => {
    const req = makeReq('10.0.0.3');
    const opts = { limit: 5, windowMs: 60_000 };

    checkRateLimit(req, opts); // 1 used
    const result = checkRateLimit(req, opts); // 2 used

    expect(result.remaining).toBe(3);
  });

  it('isolates different IPs', () => {
    const reqA = makeReq('192.168.1.1');
    const reqB = makeReq('192.168.1.2');
    const opts = { limit: 2, windowMs: 60_000 };

    checkRateLimit(reqA, opts);
    checkRateLimit(reqA, opts);
    const resultA = checkRateLimit(reqA, opts);

    const resultB = checkRateLimit(reqB, opts);

    expect(resultA.success).toBe(false); // A is over limit
    expect(resultB.success).toBe(true);  // B is fresh
  });

  it('returns correct limit and resetAt metadata', () => {
    const req = makeReq('10.0.0.99');
    const opts = { limit: 10, windowMs: 30_000 };

    const result = checkRateLimit(req, opts);

    expect(result.limit).toBe(10);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});
