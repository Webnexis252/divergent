import { Redis } from '@upstash/redis';

/**
 * Lets the server cancel sign-in tokens before they expire. Tokens are
 * stateless 7-day JWTs, so without this a stolen token kept working after the
 * student logged out or changed their password.
 *
 * Two kinds of revocation, both stored in Upstash Redis and expiring with the
 * longest-lived token they could affect:
 *  - one token (`auth:revoked-token:<jti>`): logout on this device
 *  - every token a user got before a moment (`auth:revoked-before:<userId>`):
 *    password changes, "sign out everywhere"
 *
 * Every authenticated request checks both, so lookups are cached per server
 * instance for 30 seconds: a revocation takes effect within 30s everywhere
 * (immediately on the instance that made it), and a busy user costs one Redis
 * call per instance per 30s rather than one per request.
 *
 * Fails open: if Redis can't be reached, tokens are accepted as before rather
 * than signing every student out. Without Redis configured (local dev) the
 * revocations live in this process's memory.
 */

const TOKEN_LIFETIME_SECS = 7 * 24 * 60 * 60;
const LOCAL_CACHE_MS = 30_000;
const LOCAL_CACHE_MAX_ENTRIES = 50_000;

const userKey = (userId: string) => `auth:revoked-before:${userId}`;
const tokenKey = (jti: string) => `auth:revoked-token:${jti}`;

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    redis = url && token ? new Redis({ url, token }) : null;
  }
  return redis;
}

const memoryStore = new Map<string, { value: number; expiresAt: number }>();
const lookupCache = new Map<string, { revokedBefore: number; tokenRevoked: boolean; expiresAt: number }>();

function readMemory(key: string): number | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

async function store(key: string, value: number, ttlSecs: number) {
  const client = getRedis();
  if (client) await client.set(key, value, { ex: ttlSecs });
  else memoryStore.set(key, { value, expiresAt: Date.now() + ttlSecs * 1000 });
}

function forget(predicate: (cacheKey: string) => boolean) {
  for (const key of lookupCache.keys()) if (predicate(key)) lookupCache.delete(key);
}

/** True if this token was logged out, or the user revoked every token issued before it. */
export async function isTokenRevoked(claims: { userId: string; jti?: string; iat?: number }): Promise<boolean> {
  const cacheKey = `${claims.userId}|${claims.jti ?? ''}`;
  let entry = lookupCache.get(cacheKey);

  if (!entry || entry.expiresAt < Date.now()) {
    try {
      const keys = [userKey(claims.userId), ...(claims.jti ? [tokenKey(claims.jti)] : [])];
      const client = getRedis();
      const values = client ? await client.mget<(number | string | null)[]>(...keys) : keys.map(readMemory);
      entry = {
        revokedBefore: Number(values[0] ?? 0) || 0,
        tokenRevoked: Boolean(values[1]),
        expiresAt: Date.now() + LOCAL_CACHE_MS,
      };
      if (lookupCache.size >= LOCAL_CACHE_MAX_ENTRIES) lookupCache.clear();
      lookupCache.set(cacheKey, entry);
    } catch (err) {
      console.error('[SESSION_REVOCATION] Lookup failed; accepting token', err);
      return false;
    }
  }

  if (entry.tokenRevoked) return true;
  // Strictly before: a token issued in the same second as the revocation (the
  // fresh one handed out right after a password change) stays valid
  return typeof claims.iat === 'number' && claims.iat < entry.revokedBefore;
}

/** Signs the user out of every device: tokens issued before now stop working. */
export async function revokeAllSessions(userId: string, now = Date.now()): Promise<void> {
  await store(userKey(userId), Math.floor(now / 1000), TOKEN_LIFETIME_SECS);
  forget((key) => key.startsWith(`${userId}|`));
}

/** Signs out one token (this device), until it would have expired anyway. */
export async function revokeToken(jti: string, expiresAtSecs?: number): Promise<void> {
  const ttl = expiresAtSecs ? Math.max(1, expiresAtSecs - Math.floor(Date.now() / 1000)) : TOKEN_LIFETIME_SECS;
  await store(tokenKey(jti), 1, ttl);
  forget((key) => key.endsWith(`|${jti}`));
}

/** Test helper: clears this process's caches and in-memory store. */
export function resetSessionRevocationForTests() {
  memoryStore.clear();
  lookupCache.clear();
  redis = undefined;
}
