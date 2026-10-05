/**
 * Bloom filters answering "is this email / phone already registered?".
 *
 * Public signup endpoints ask the filter before querying Postgres. A
 * "definitely not registered" answer skips the lookup; "maybe" falls through
 * to the normal DB check. The unique constraints on User.email and User.phone
 * stay the source of truth: the filter is only a shortcut, and every failure
 * (Redis down, filter never built, key evicted) degrades to "maybe", which is
 * exactly the behaviour without a filter.
 *
 *  • **Upstash Redis** — one bitmap per kind, shared by every serverless
 *    instance. A lookup or an insert is a single BITFIELD command.
 *
 *  • **In-memory fallback** — local development without Upstash. Built from
 *    the DB on first use and per-instance only, like the rate-limit fallback.
 *
 * Bloom filters can't delete, so deleted users and replaced phone numbers
 * leave stale bits behind (harmless extra "maybe"s) until the filters are
 * rebuilt from the DB by GET /api/cron/rebuild-auth-bloom. In Redis mode the
 * filter isn't used at all until that endpoint has run once.
 *
 * @example
 * if (await mightBeRegistered('email', email)) {
 *   const existing = await prisma.user.findUnique({ where: { email } });
 *   if (existing) return apiError('An account with this email already exists', 409);
 * }
 * const user = await prisma.user.create({ data: { email, ... } });
 * await recordRegistered(user);
 */

import { Redis } from '@upstash/redis';
import { after } from 'next/server';
import prisma from '@/lib/prisma';
import {
  BloomFilter,
  bloomPositions,
  estimateFalsePositiveRate,
  optimalBloomParams,
} from '@/lib/bloom-filter';

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdentityKind = 'email' | 'phone';

export interface AuthBloomRebuildResult {
  emails: number;
  phones: number;
  bitsPerFilter: number;
  hashFunctions: number;
  estimatedFalsePositiveRate: Record<IdentityKind, number>;
  durationMs: number;
}

export class AuthBloomRebuildInProgressError extends Error {
  constructor() {
    super('An auth Bloom filter rebuild is already running.');
    this.name = 'AuthBloomRebuildInProgressError';
  }
}

// ─── Sizing ───────────────────────────────────────────────────────────────────

// 1M identities at a 1% false-positive rate: ~9.6M bits (~1.2 MB per filter)
// and 7 bit positions per value. Changing these moves the filters to new Redis
// keys, so lookups fall back to the DB until the next rebuild.
const CAPACITY = 1_000_000;
const FALSE_POSITIVE_RATE = 0.01;
const PARAMS = optimalBloomParams(CAPACITY, FALSE_POSITIVE_RATE);

// Bit m is never a data bit. A rebuild sets it just before the filter goes
// live, so reading 0 here means "no complete filter at this key": never built,
// evicted, or only partially written by inserts.
const READY_BIT = PARAMS.m;

const KEY_PREFIX = `auth:bloom:v1:${PARAMS.m}:${PARAMS.k}`;
const LOCK_KEY = `${KEY_PREFIX}:rebuild-lock`;
const LOCK_TTL_SECONDS = 300;

const SCAN_BATCH_SIZE = 5000;
// 32-bit words copied per BITFIELD command when publishing a rebuild.
const WORDS_PER_COMMAND = 1000;

const KINDS: IdentityKind[] = ['email', 'phone'];

/**
 * Canonical form used for both inserts and lookups. It must map a stored value
 * and the value a route looks it up with to the same string, otherwise the
 * filter could say "definitely not" for a row the DB would find.
 */
export function normalizeIdentity(kind: IdentityKind, value: string): string {
  return kind === 'email'
    ? value.trim().toLowerCase()
    : value.replace(/[\s\-()]/g, '');
}

// ─── Detect mode ──────────────────────────────────────────────────────────────

const isUpstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

// ─── Upstash path ─────────────────────────────────────────────────────────────

function redisKey(kind: IdentityKind): string {
  return `${KEY_PREFIX}:${kind}`;
}

async function redisMightContain(kind: IdentityKind, value: string): Promise<boolean> {
  const command = getRedis().bitfield(redisKey(kind)).get('u1', READY_BIT);
  for (const pos of bloomPositions(value, PARAMS)) {
    command.get('u1', pos);
  }

  const [ready, ...bits] = await command.exec();
  if (ready !== 1) return true;
  return bits.every((bit) => bit === 1);
}

async function redisAdd(kind: IdentityKind, value: string): Promise<void> {
  const command = getRedis().bitfield(redisKey(kind));
  for (const pos of bloomPositions(value, PARAMS)) {
    command.set('u1', pos, 1);
  }
  await command.exec();
}

/**
 * Copies a freshly built filter into a staging key, marks it ready, then
 * RENAMEs it over the live key, so lookups never see a half-written filter.
 */
async function publishToRedis(kind: IdentityKind, filter: BloomFilter): Promise<void> {
  const client = getRedis();
  const liveKey = redisKey(kind);
  const stagingKey = `${liveKey}:staging`;
  await client.del(stagingKey);

  // A new key reads as all zeros, so only non-zero words need copying.
  const view = new DataView(filter.bits.buffer, filter.bits.byteOffset, filter.bits.byteLength);
  let command = client.bitfield(stagingKey);
  let queued = 0;
  for (let word = 0; word < filter.bits.byteLength / 4; word++) {
    const value = view.getUint32(word * 4); // big-endian: same bit order as Redis
    if (value === 0) continue;

    command.set('u32', `#${word}`, value);
    if (++queued === WORDS_PER_COMMAND) {
      await command.exec();
      command = client.bitfield(stagingKey);
      queued = 0;
    }
  }
  command.set('u1', READY_BIT, 1);
  await command.exec();

  await client.rename(stagingKey, liveKey);
}

// ─── In-memory fallback ───────────────────────────────────────────────────────

let memoryFilters: Promise<Record<IdentityKind, BloomFilter>> | null = null;

function getMemoryFilters(): Promise<Record<IdentityKind, BloomFilter>> {
  if (!memoryFilters) {
    memoryFilters = buildFromDatabase().then(
      ({ filters }) => filters,
      (err) => {
        memoryFilters = null; // retry the build on the next call
        throw err;
      },
    );
  }
  return memoryFilters;
}

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * Scans every user into fresh filters. Soft-deleted rows are included because
 * they still hold their unique email / phone.
 */
async function buildFromDatabase() {
  const filters: Record<IdentityKind, BloomFilter> = {
    email: new BloomFilter(PARAMS),
    phone: new BloomFilter(PARAMS),
  };
  const counts: Record<IdentityKind, number> = { email: 0, phone: 0 };

  let cursor: string | undefined;
  for (;;) {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, phone: true },
      orderBy: { id: 'asc' },
      take: SCAN_BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    for (const user of users) {
      for (const kind of KINDS) {
        const value = user[kind];
        if (!value) continue;
        filters[kind].add(normalizeIdentity(kind, value));
        counts[kind]++;
      }
    }

    if (users.length < SCAN_BATCH_SIZE) break;
    cursor = users[users.length - 1].id;
  }

  return { filters, counts };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns `false` only when `value` is definitely not registered, so the caller
 * may skip its DB lookup. Returns `true` ("maybe") on a filter hit and whenever
 * the filter can't answer, in which case the caller runs its normal DB check.
 */
export async function mightBeRegistered(
  kind: IdentityKind,
  value: string,
): Promise<boolean> {
  const normalized = normalizeIdentity(kind, value);
  if (!normalized) return true;

  try {
    if (isUpstashConfigured) {
      return await redisMightContain(kind, normalized);
    }
    const filters = await getMemoryFilters();
    return filters[kind].mightContain(normalized);
  } catch (err) {
    console.error('[AUTH_BLOOM] Lookup failed, falling back to the DB:', err);
    return true;
  }
}

/**
 * Adds a user's email / phone after it is written to the DB. Never throws: a
 * missed insert can only cause a wrong "definitely not", which the unique
 * constraint still rejects, and the next rebuild repairs it.
 */
export async function recordRegistered(identity: {
  email?: string | null;
  phone?: string | null;
}): Promise<void> {
  const entries: Array<[IdentityKind, string]> = [];
  for (const kind of KINDS) {
    const value = identity[kind];
    const normalized = value ? normalizeIdentity(kind, value) : '';
    if (normalized) entries.push([kind, normalized]);
  }
  if (entries.length === 0) return;

  try {
    if (isUpstashConfigured) {
      await Promise.all(entries.map(([kind, value]) => redisAdd(kind, value)));
      return;
    }
    // Not built yet: the first lookup's DB scan will pick this row up.
    if (!memoryFilters) return;
    const filters = await memoryFilters;
    for (const [kind, value] of entries) {
      filters[kind].add(value);
    }
  } catch (err) {
    console.error('[AUTH_BLOOM] Insert failed; the next rebuild will include it:', err);
  }
}

/**
 * `recordRegistered` scheduled after the response is sent (Next.js `after`),
 * so signup doesn't wait on the Redis write.
 */
export function recordRegisteredInBackground(identity: {
  email?: string | null;
  phone?: string | null;
}): void {
  after(() => recordRegistered(identity));
}

/**
 * Rebuilds both filters from the DB and swaps them in. This is the only way
 * deleted users and replaced phone numbers leave the filter.
 *
 * @throws AuthBloomRebuildInProgressError if another rebuild holds the lock.
 */
export async function rebuildAuthBloomFilters(): Promise<AuthBloomRebuildResult> {
  const startedAt = new Date();

  if (isUpstashConfigured) {
    const acquired = await getRedis().set(LOCK_KEY, startedAt.toISOString(), {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });
    if (!acquired) throw new AuthBloomRebuildInProgressError();
  }

  try {
    const { filters, counts } = await buildFromDatabase();

    if (isUpstashConfigured) {
      for (const kind of KINDS) {
        await publishToRedis(kind, filters[kind]);
      }
    } else {
      memoryFilters = Promise.resolve(filters);
    }

    // Rows written while the scan ran may have been missed by it, and their
    // inserts went into the filter that was just replaced. Add them again.
    const changed = await prisma.user.findMany({
      where: { updatedAt: { gte: startedAt } },
      select: { email: true, phone: true },
    });
    for (const user of changed) {
      await recordRegistered(user);
    }

    return {
      emails: counts.email,
      phones: counts.phone,
      bitsPerFilter: PARAMS.m,
      hashFunctions: PARAMS.k,
      estimatedFalsePositiveRate: {
        email: estimateFalsePositiveRate(counts.email, PARAMS),
        phone: estimateFalsePositiveRate(counts.phone, PARAMS),
      },
      durationMs: Date.now() - startedAt.getTime(),
    };
  } finally {
    if (isUpstashConfigured) {
      await getRedis().del(LOCK_KEY).catch(() => {});
    }
  }
}
