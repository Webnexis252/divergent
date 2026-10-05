import { describe, it, expect } from 'vitest';
import {
  BloomFilter,
  bloomPositions,
  estimateFalsePositiveRate,
  optimalBloomParams,
} from '@/lib/bloom-filter';

describe('optimalBloomParams', () => {
  it('sizes 1M items at 1% to ~9.6M bits and 7 hash functions', () => {
    expect(optimalBloomParams(1_000_000, 0.01)).toEqual({ m: 9_585_059, k: 7 });
  });

  it('rejects invalid capacity and false-positive rates', () => {
    expect(() => optimalBloomParams(0, 0.01)).toThrow();
    expect(() => optimalBloomParams(100, 0)).toThrow();
    expect(() => optimalBloomParams(100, 1)).toThrow();
  });
});

describe('estimateFalsePositiveRate', () => {
  const params = optimalBloomParams(1_000_000, 0.01);

  it('is about the target rate at capacity', () => {
    expect(estimateFalsePositiveRate(1_000_000, params)).toBeCloseTo(0.01, 2);
  });

  it('is 0 for an empty filter and grows past capacity', () => {
    expect(estimateFalsePositiveRate(0, params)).toBe(0);
    expect(estimateFalsePositiveRate(2_000_000, params)).toBeGreaterThan(0.05);
  });
});

describe('bloomPositions', () => {
  it('returns k deterministic positions inside [0, m)', () => {
    const params = { m: 1000, k: 5 };
    const positions = bloomPositions('student@example.com', params);

    expect(positions).toHaveLength(5);
    expect(positions.every((p) => p >= 0 && p < 1000)).toBe(true);
    expect(bloomPositions('student@example.com', params)).toEqual(positions);
  });
});

describe('BloomFilter', () => {
  const params = optimalBloomParams(10_000, 0.01);
  const members = Array.from({ length: 10_000 }, (_, i) => `user${i}@example.com`);

  it('never gives a false negative', () => {
    const filter = new BloomFilter(params);
    members.forEach((m) => filter.add(m));

    expect(members.every((m) => filter.mightContain(m))).toBe(true);
  });

  it('keeps the false-positive rate near the target at capacity', () => {
    const filter = new BloomFilter(params);
    members.forEach((m) => filter.add(m));

    const probes = Array.from({ length: 10_000 }, (_, i) => `absent${i}@example.com`);
    const falsePositives = probes.filter((p) => filter.mightContain(p)).length;

    expect(falsePositives / probes.length).toBeLessThan(0.02);
  });

  it('uses the Redis bit order: bit 0 is the MSB of byte 0', () => {
    const tiny = { m: 64, k: 1 };
    const filter = new BloomFilter(tiny);
    const [pos] = bloomPositions('a', tiny);
    filter.add('a');

    expect(filter.bits[Math.floor(pos / 8)]).toBe(0x80 >> pos % 8);
  });

  it('pads storage to whole 32-bit words', () => {
    expect(new BloomFilter({ m: 32, k: 1 }).bits.length).toBe(4);
    expect(new BloomFilter({ m: 33, k: 1 }).bits.length).toBe(8);
  });
});
