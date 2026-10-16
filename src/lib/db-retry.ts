import { Prisma } from '@prisma/client';

/**
 * Which failed queries the Prisma client may retry (see prisma.ts).
 *
 * Reads are safe to repeat after any transient connection error. Writes are
 * not: if the connection drops after Postgres committed an INSERT but before
 * the reply arrived, a retry inserts the row a second time. So writes are only
 * retried when the error shows the query never reached the database.
 */

const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * A transient connection or pool error. Covers the known Supabase PgBouncer
 * failure modes: P1001 (can't reach server), P1017 (server closed the
 * connection), P2024 (pool timeout), resets, refusals and slot exhaustion.
 */
export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ['P1001', 'P1017', 'P2024'].includes(error.code);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      isNeverSentMessage(msg) ||
      msg.includes('server has closed the connection') ||
      msg.includes('econnreset') ||
      msg.includes('socket hang up') ||
      msg.includes('connection terminated') ||
      msg.includes('connection reset') ||
      msg.includes('ssl connection has been closed')
    );
  }
  return false;
}

function isNeverSentMessage(msg: string): boolean {
  return (
    msg.includes("can't reach database server") ||
    msg.includes('connection pool timed out') ||
    msg.includes('timed out fetching') ||
    msg.includes('econnrefused') ||
    msg.includes('connection refused') ||
    msg.includes('remaining connection slots are reserved') ||
    msg.includes('too many connections')
  );
}

/** The query failed before reaching Postgres (no connection, pool timeout), so it can't have run. */
export function isNeverSentError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P1001' || error.code === 'P2024';
  }
  return error instanceof Error && isNeverSentMessage(error.message.toLowerCase());
}

export function shouldRetryQuery(operation: string, error: unknown): boolean {
  return READ_OPERATIONS.has(operation) ? isTransientDbError(error) : isNeverSentError(error);
}
