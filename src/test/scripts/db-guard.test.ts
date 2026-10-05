// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertDifferentDatabases,
  assertWritableDatabase,
  databaseIdentity,
} from '../../../scripts/lib/db-guard.mjs';

const prodPooler = 'postgresql://postgres.abcprodref:pw@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
const prodSession = 'postgresql://postgres.abcprodref:pw@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';
const prodDirect = 'postgresql://postgres:pw@db.abcprodref.supabase.co:5432/postgres';
const staging = 'postgresql://postgres.stagingref:pw@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';
const local = 'postgresql://postgres@localhost:55432/lms_test';

beforeEach(() => vi.unstubAllEnvs());

describe('db-guard', () => {
  it('identifies a Supabase project the same way through any of its URLs', () => {
    expect(databaseIdentity(prodPooler)).toBe('supabase:abcprodref');
    expect(databaseIdentity(prodSession)).toBe('supabase:abcprodref');
    expect(databaseIdentity(prodDirect)).toBe('supabase:abcprodref');
    expect(databaseIdentity(local)).toBe('localhost:55432/lms_test');
  });

  it('allows local databases without confirmation', () => {
    expect(() => assertWritableDatabase(local, 'seed')).not.toThrow();
  });

  it('refuses remote databases unless CONFIRM_DATABASE names that exact database', () => {
    expect(() => assertWritableDatabase(staging, 'seed')).toThrow(/CONFIRM_DATABASE=supabase:stagingref/);
    vi.stubEnv('CONFIRM_DATABASE', 'supabase:stagingref');
    expect(() => assertWritableDatabase(staging, 'seed')).not.toThrow();
    expect(() => assertWritableDatabase(prodPooler, 'seed')).toThrow();
  });

  it('refuses a test database that is the app database under another URL', () => {
    expect(() => assertDifferentDatabases(prodSession, prodPooler, 'truncate')).toThrow(/same as DATABASE_URL/);
    expect(() => assertDifferentDatabases(local, prodPooler, 'truncate')).not.toThrow();
  });

  it('refuses when no URL is set', () => {
    expect(() => assertWritableDatabase(undefined, 'seed')).toThrow(/No database URL/);
  });
});
