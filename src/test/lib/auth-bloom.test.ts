import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type UserRow = { id: string; email: string | null; phone: string | null };

const { findMany, redisState, FakeRedis } = vi.hoisted(() => {
  const bitmaps = new Map<string, Uint8Array>();
  const strings = new Map<string, string>();

  function getBit(key: string, offset: number): number {
    const bytes = bitmaps.get(key);
    const index = Math.floor(offset / 8);
    if (!bytes || index >= bytes.length) return 0;
    return (bytes[index] >> (7 - (offset % 8))) & 1;
  }

  function setBit(key: string, offset: number, bit: number): void {
    let bytes = bitmaps.get(key) ?? new Uint8Array(0);
    const index = Math.floor(offset / 8);
    if (index >= bytes.length) {
      const grown = new Uint8Array(index + 1);
      grown.set(bytes);
      bytes = grown;
    }
    const mask = 0x80 >> (offset % 8);
    bytes[index] = bit ? bytes[index] | mask : bytes[index] & ~mask;
    bitmaps.set(key, bytes);
  }

  /** Minimal BITFIELD: uN / iN types, plain bit offsets and `#n` word offsets. */
  class FakeBitfield {
    private ops: Array<() => number> = [];
    constructor(private key: string) {}

    private locate(type: string, offset: number | string) {
      const width = Number(type.slice(1));
      const start =
        typeof offset === 'string' && offset.startsWith('#')
          ? Number(offset.slice(1)) * width
          : Number(offset);
      return { width, start };
    }

    private read(start: number, width: number): number {
      let value = 0;
      for (let i = 0; i < width; i++) value = value * 2 + getBit(this.key, start + i);
      return value;
    }

    get(type: string, offset: number | string) {
      const { width, start } = this.locate(type, offset);
      this.ops.push(() => this.read(start, width));
      return this;
    }

    set(type: string, offset: number | string, value: number) {
      const { width, start } = this.locate(type, offset);
      this.ops.push(() => {
        const previous = this.read(start, width);
        for (let i = 0; i < width; i++) {
          setBit(this.key, start + i, Math.floor(value / 2 ** (width - 1 - i)) % 2);
        }
        return previous;
      });
      return this;
    }

    async exec() {
      return this.ops.map((op) => op());
    }
  }

  class FakeRedis {
    bitfield(key: string) {
      return new FakeBitfield(key);
    }
    async del(key: string) {
      return bitmaps.delete(key) || strings.delete(key) ? 1 : 0;
    }
    async rename(source: string, destination: string) {
      const bytes = bitmaps.get(source);
      if (!bytes) throw new Error('ERR no such key');
      bitmaps.set(destination, bytes);
      bitmaps.delete(source);
      return 'OK';
    }
    async set(key: string, value: string, opts?: { nx?: boolean }) {
      if (opts?.nx && strings.has(key)) return null;
      strings.set(key, value);
      return 'OK';
    }
  }

  return { findMany: vi.fn(), redisState: { bitmaps, strings }, FakeRedis };
});

vi.mock('@/lib/prisma', () => ({ default: { user: { findMany } } }));
vi.mock('@upstash/redis', () => ({ Redis: FakeRedis }));

let users: UserRow[] = [];
let changedDuringRebuild: Array<Pick<UserRow, 'email' | 'phone'>> = [];

beforeEach(() => {
  users = [
    { id: 'u1', email: 'asha@example.com', phone: '+919876543210' },
    { id: 'u2', email: 'ravi@example.com', phone: null },
  ];
  changedDuringRebuild = [];
  redisState.bitmaps.clear();
  redisState.strings.clear();
  findMany.mockReset();
  // The full scan has no `where`; the post-rebuild catch-up filters on updatedAt.
  findMany.mockImplementation(async (args: { where?: unknown }) =>
    args.where ? changedDuringRebuild : users,
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function loadAuthBloom(mode: 'memory' | 'redis') {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', mode === 'redis' ? 'https://fake.upstash.io' : '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', mode === 'redis' ? 'token' : '');
  vi.resetModules();
  return import('@/lib/auth-bloom');
}

describe('normalizeIdentity', () => {
  it('lowercases and trims emails, strips phone formatting', async () => {
    const { normalizeIdentity } = await loadAuthBloom('memory');

    expect(normalizeIdentity('email', '  Asha@Example.COM ')).toBe('asha@example.com');
    expect(normalizeIdentity('phone', '+91 (98765) 43-210')).toBe('+919876543210');
  });
});

describe('auth Bloom filter — in-memory fallback', () => {
  it('answers "definitely not" for new identities and "maybe" for existing ones', async () => {
    const { mightBeRegistered } = await loadAuthBloom('memory');

    expect(await mightBeRegistered('email', 'new.student@example.com')).toBe(false);
    expect(await mightBeRegistered('email', 'ASHA@example.com')).toBe(true);
    expect(await mightBeRegistered('phone', '+91 98765 43210')).toBe(true);
    expect(await mightBeRegistered('phone', '+910000000000')).toBe(false);
  });

  it('builds from the DB once and serves later lookups from memory', async () => {
    const { mightBeRegistered } = await loadAuthBloom('memory');

    await mightBeRegistered('email', 'a@example.com');
    await mightBeRegistered('email', 'b@example.com');

    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('sees identities recorded after the build', async () => {
    const { mightBeRegistered, recordRegistered } = await loadAuthBloom('memory');

    expect(await mightBeRegistered('email', 'late@example.com')).toBe(false);
    await recordRegistered({ email: 'late@example.com', phone: '+911112223334' });

    expect(await mightBeRegistered('email', 'late@example.com')).toBe(true);
    expect(await mightBeRegistered('phone', '+911112223334')).toBe(true);
  });

  it('falls back to "maybe" when the DB scan fails, and retries the build', async () => {
    const { mightBeRegistered } = await loadAuthBloom('memory');
    findMany.mockRejectedValueOnce(new Error('db down'));

    expect(await mightBeRegistered('email', 'new.student@example.com')).toBe(true);
    expect(await mightBeRegistered('email', 'new.student@example.com')).toBe(false);
  });

  it('rebuild drops deleted users and reports counts', async () => {
    const { mightBeRegistered, rebuildAuthBloomFilters } = await loadAuthBloom('memory');
    expect(await mightBeRegistered('email', 'ravi@example.com')).toBe(true);

    users = users.filter((u) => u.id !== 'u2');
    const result = await rebuildAuthBloomFilters();

    expect(result).toMatchObject({ emails: 1, phones: 1, hashFunctions: 7 });
    expect(await mightBeRegistered('email', 'ravi@example.com')).toBe(false);
    expect(await mightBeRegistered('email', 'asha@example.com')).toBe(true);
  });
});

describe('auth Bloom filter — Upstash Redis', () => {
  it('says "maybe" until the first rebuild, without touching the DB', async () => {
    const { mightBeRegistered, recordRegistered } = await loadAuthBloom('redis');
    await recordRegistered({ email: 'someone@example.com' });

    expect(await mightBeRegistered('email', 'new.student@example.com')).toBe(true);
    expect(findMany).not.toHaveBeenCalled();
  });

  it('after a rebuild, answers from the Redis bitmap', async () => {
    const { mightBeRegistered, rebuildAuthBloomFilters } = await loadAuthBloom('redis');
    await rebuildAuthBloomFilters();

    expect(await mightBeRegistered('email', 'new.student@example.com')).toBe(false);
    expect(await mightBeRegistered('email', 'Asha@Example.com')).toBe(true);
    expect(await mightBeRegistered('phone', '+919876543210')).toBe(true);
    expect(await mightBeRegistered('phone', '+910000000000')).toBe(false);
  });

  it('sees identities recorded after the rebuild', async () => {
    const { mightBeRegistered, recordRegistered, rebuildAuthBloomFilters } =
      await loadAuthBloom('redis');
    await rebuildAuthBloomFilters();

    await recordRegistered({ email: 'late@example.com' });

    expect(await mightBeRegistered('email', 'late@example.com')).toBe(true);
  });

  it('re-adds rows written while the rebuild was scanning', async () => {
    const { mightBeRegistered, rebuildAuthBloomFilters } = await loadAuthBloom('redis');
    changedDuringRebuild = [{ email: 'mid.scan@example.com', phone: null }];

    await rebuildAuthBloomFilters();

    expect(await mightBeRegistered('email', 'mid.scan@example.com')).toBe(true);
  });

  it('swaps via a staging key and releases the lock', async () => {
    const { rebuildAuthBloomFilters } = await loadAuthBloom('redis');
    await rebuildAuthBloomFilters();

    const keys = [...redisState.bitmaps.keys()];
    expect(keys.some((k) => k.endsWith(':email'))).toBe(true);
    expect(keys.some((k) => k.endsWith(':phone'))).toBe(true);
    expect(keys.some((k) => k.endsWith(':staging'))).toBe(false);
    expect(redisState.strings.size).toBe(0);
  });

  it('refuses to run two rebuilds at once', async () => {
    const { rebuildAuthBloomFilters, AuthBloomRebuildInProgressError } =
      await loadAuthBloom('redis');

    const first = rebuildAuthBloomFilters(); // takes the lock before its first await
    await expect(rebuildAuthBloomFilters()).rejects.toBeInstanceOf(
      AuthBloomRebuildInProgressError,
    );
    await first;
  });

  it('falls back to "maybe" when Redis errors', async () => {
    const { mightBeRegistered, rebuildAuthBloomFilters } = await loadAuthBloom('redis');
    await rebuildAuthBloomFilters();
    vi.spyOn(FakeRedis.prototype, 'bitfield').mockImplementationOnce(() => {
      throw new Error('redis down');
    });

    expect(await mightBeRegistered('email', 'new.student@example.com')).toBe(true);
  });
});
