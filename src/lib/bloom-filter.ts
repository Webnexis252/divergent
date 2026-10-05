import { createHash } from 'crypto';

/**
 * Generic Bloom filter primitives.
 *
 * A Bloom filter answers "is X in the set?" with either "definitely not" or
 * "maybe". It never gives a false negative, so a "definitely not" answer can
 * safely skip the authoritative lookup, while a "maybe" must still be checked.
 *
 * Bit layout matches Redis GETBIT / SETBIT / BITFIELD: bit 0 is the most
 * significant bit of byte 0. A filter built in memory can therefore be copied
 * into a Redis bitmap one 32-bit word at a time and read back with BITFIELD.
 */

export interface BloomParams {
  /** Number of bits in the filter. */
  m: number;
  /** Number of hash functions, i.e. bit positions per item. */
  k: number;
}

/**
 * Sizes a filter for `capacity` items at a target false-positive rate.
 *   m = −n·ln(p) / (ln 2)²
 *   k = (m / n)·ln 2
 */
export function optimalBloomParams(
  capacity: number,
  falsePositiveRate: number,
): BloomParams {
  if (capacity <= 0) {
    throw new Error('Bloom filter capacity must be positive.');
  }
  if (falsePositiveRate <= 0 || falsePositiveRate >= 1) {
    throw new Error('Bloom filter false-positive rate must be between 0 and 1.');
  }

  const m = Math.max(
    2,
    Math.ceil((-capacity * Math.log(falsePositiveRate)) / Math.LN2 ** 2),
  );
  const k = Math.max(1, Math.round((m / capacity) * Math.LN2));
  return { m, k };
}

/**
 * Expected false-positive rate once `itemCount` items are in the filter:
 *   p ≈ (1 − e^(−k·n/m))^k
 */
export function estimateFalsePositiveRate(
  itemCount: number,
  { m, k }: BloomParams,
): number {
  return (1 - Math.exp((-k * itemCount) / m)) ** k;
}

/**
 * Returns the k bit positions for `value` using double hashing
 * (Kirsch–Mitzenmacher): position_i = (h1 + i·h2) mod m. Both halves come
 * from one SHA-256 digest, so each item is hashed once regardless of k.
 */
export function bloomPositions(value: string, { m, k }: BloomParams): number[] {
  const digest = createHash('sha256').update(value).digest();
  const h1 = digest.readUInt32BE(0);
  // h2 must be non-zero mod m, otherwise every position collapses onto h1.
  const h2 = (digest.readUInt32BE(4) % (m - 1)) + 1;

  const positions: number[] = [];
  for (let i = 0; i < k; i++) {
    positions.push((h1 + i * h2) % m);
  }
  return positions;
}

/**
 * In-memory Bloom filter. `bits` is padded to a whole number of 32-bit words
 * so it can be copied into Redis with `BITFIELD SET u32 #n`.
 */
export class BloomFilter {
  readonly params: BloomParams;
  readonly bits: Uint8Array;

  constructor(params: BloomParams) {
    this.params = params;
    this.bits = new Uint8Array(Math.ceil(params.m / 32) * 4);
  }

  add(value: string): void {
    for (const pos of bloomPositions(value, this.params)) {
      this.bits[Math.floor(pos / 8)] |= 0x80 >> pos % 8;
    }
  }

  mightContain(value: string): boolean {
    return bloomPositions(value, this.params).every(
      (pos) => (this.bits[Math.floor(pos / 8)] & (0x80 >> pos % 8)) !== 0,
    );
  }
}
