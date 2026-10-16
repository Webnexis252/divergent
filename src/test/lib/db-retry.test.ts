import { describe, expect, it } from 'vitest';
import { Prisma } from '@prisma/client';
import { shouldRetryQuery } from '@/lib/db-retry';

const known = (code: string) => new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: 'test' });

describe('shouldRetryQuery', () => {
  it('retries reads after a dropped connection', () => {
    expect(shouldRetryQuery('findMany', new Error('read ECONNRESET'))).toBe(true);
    expect(shouldRetryQuery('count', known('P1017'))).toBe(true);
  });

  it("doesn't retry writes when the query may already have run", () => {
    expect(shouldRetryQuery('create', new Error('read ECONNRESET'))).toBe(false);
    expect(shouldRetryQuery('update', known('P1017'))).toBe(false);
  });

  it('retries writes that never reached the database', () => {
    expect(shouldRetryQuery('create', known('P1001'))).toBe(true);
    expect(shouldRetryQuery('upsert', known('P2024'))).toBe(true);
    expect(shouldRetryQuery('update', new Error('connect ECONNREFUSED 127.0.0.1:6543'))).toBe(true);
  });

  it("doesn't retry ordinary query errors", () => {
    expect(shouldRetryQuery('findUnique', known('P2025'))).toBe(false);
    expect(shouldRetryQuery('create', known('P2002'))).toBe(false);
  });
});
