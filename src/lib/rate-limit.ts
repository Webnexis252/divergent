/**
 * Production-grade rate limiter with dual-mode support:
 *
 *  • **Upstash Redis** — Used when `UPSTASH_REDIS_REST_URL` and
 *    `UPSTASH_REDIS_REST_TOKEN` are set.  Works across all serverless
 *    replicas / regions because the state lives in Redis.
 *
 *  • **In-memory fallback** — Used in local development or when
 *    Upstash is not configured.  Per-instance only (each serverless
 *    invocation gets its own memory), so this is NOT suitable for
 *    production on Vercel.
 *
 * @example
 * const { success, remaining } = await checkRateLimit(req, authLimiter);
 * if (!success) return apiError('Too many requests.', 429);
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the time window. */
  limit: number;
  /** Time window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

// ─── Detect mode ──────────────────────────────────────────────────────────────

const isUpstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

// Lazily created — only initialised when the first request comes in.
let redis: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

/**
 * Returns (or creates) a `Ratelimit` instance keyed by the
 * `limit:windowMs` pair so that each preset re-uses the same object.
 */
function getUpstashLimiter(options: RateLimitOptions): Ratelimit {
  const key = `${options.limit}:${options.windowMs}`;
  let limiter = upstashLimiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.fixedWindow(
        options.limit,
        `${options.windowMs}ms` as `${number} ms`,
      ),
      analytics: false,
      prefix: 'ratelimit',
    });
    upstashLimiters.set(key, limiter);
  }
  return limiter;
}

// ─── In-memory fallback (dev / CI) ───────────────────────────────────────────

interface InMemoryRecord {
  count: number;
  resetAt: number;
}

const memStore = new Map<string, InMemoryRecord>();
let lastEviction = Date.now();

function evictStale() {
  const now = Date.now();
  if (now - lastEviction < 60_000) return;
  lastEviction = now;
  for (const [key, record] of memStore.entries()) {
    if (record.resetAt < now) memStore.delete(key);
  }
}

function checkInMemory(
  ip: string,
  options: RateLimitOptions,
): RateLimitResult {
  evictStale();
  const { limit, windowMs } = options;
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;

  const key = `${ip}:${windowStart}`;
  const record = memStore.get(key) ?? { count: 0, resetAt };
  record.count += 1;
  memStore.set(key, record);

  return {
    success: record.count <= limit,
    limit,
    remaining: Math.max(0, limit - record.count),
    resetAt,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Checks whether the given request IP has exceeded the rate limit.
 *
 * This is now **async** because the Upstash path does a network round-trip.
 */
export async function checkRateLimit(
  req: { headers: { get(name: string): string | null } },
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  // ── Upstash path (production) ──
  if (isUpstashConfigured) {
    const limiter = getUpstashLimiter(options);
    const result = await limiter.limit(ip);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  }

  // ── In-memory fallback (local dev) ──
  return checkInMemory(ip, options);
}

// ─── Pre-configured limiters for common use-cases ─────────────────────────────

/** Strict limiter for auth endpoints (login, register, password reset). */
export const authLimiter: RateLimitOptions = {
  limit: 10,
  windowMs: 60 * 1000, // 10 requests per minute per IP
};

/** General API limiter for standard data-fetching endpoints. */
export const apiLimiter: RateLimitOptions = {
  limit: 120,
  windowMs: 60 * 1000, // 120 requests per minute per IP
};

/** Strict limiter for payment and sensitive operations. */
export const sensitiveLimiter: RateLimitOptions = {
  limit: 5,
  windowMs: 60 * 1000, // 5 requests per minute per IP
};
