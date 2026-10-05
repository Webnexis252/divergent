import { timingSafeEqual } from 'crypto';

/**
 * Compares two secrets (webhook signatures, cron tokens) in constant time, so
 * response timing doesn't reveal how many leading characters were right.
 * Only the length can leak, and signatures have a fixed length anyway.
 */
export function safeEqual(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
