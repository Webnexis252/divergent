import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Prisma client singleton with connection-pool tuning for Vercel serverless.
 *
 * Connection limit strategy for Vercel + Supabase PgBouncer (Transaction Mode):
 *  - DATABASE_URL must point to port 6543 with ?pgbouncer=true
 *  - connection_limit=3 allows small bursts (e.g., parallel Promise.all queries)
 *    while staying well within Supabase's per-client PgBouncer limits
 *  - pool_timeout=20 prevents queries from hanging when pool is briefly full
 *
 * Retry strategy:
 *  - Covers all known Supabase/PgBouncer transient error codes:
 *    P1001 (can't reach server), P1017 (server closed connection),
 *    P2024 (pool timeout), ECONNRESET, ECONNREFUSED, socket hang up
 *  - 3 retries with exponential backoff (1s, 2s, 4s)
 */

/**
 * Ensures the DATABASE_URL has correct pool settings for Vercel serverless.
 * Uses connection_limit=3 to support small bursts without exhausting the DB.
 */
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  if (!baseUrl) {
    throw new Error('[Prisma] DATABASE_URL environment variable is not set.');
  }
  try {
    const url = new URL(baseUrl);
    // connection_limit=3: allows concurrent queries within a single serverless function
    // while staying well within Supabase PgBouncer limits.
    url.searchParams.set('connection_limit', '3');
    // pool_timeout: wait max 20s for a free connection before erroring.
    url.searchParams.set('pool_timeout', '20');
    // Ensure SSL is always required (Supabase requirement).
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }
    return url.toString();
  } catch {
    // Fallback: if URL is malformed, return as-is (will fail at connection time with clear error)
    console.error('[Prisma] DATABASE_URL is malformed:', baseUrl.slice(0, 30) + '...');
    return baseUrl;
  }
}

/**
 * Determines if a Prisma error is a transient connection/pool error that
 * is safe to retry. Covers all known Supabase PgBouncer failure modes.
 */
function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001: Can't reach database server
    // P1017: Server has closed the connection
    // P2024: Timed out fetching a new connection from the connection pool
    return ['P1001', 'P1017', 'P2024'].includes(error.code);
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("can't reach database server") ||
      msg.includes("server has closed the connection") ||
      msg.includes("connection pool timed out") ||
      msg.includes("timed out fetching") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("socket hang up") ||
      msg.includes("connection terminated") ||
      msg.includes("connection reset") ||
      msg.includes("ssl connection has been closed") ||
      msg.includes("remaining connection slots are reserved") ||
      msg.includes("too many connections") ||
      msg.includes("connection refused")
    );
  }

  return false;
}

const prismaClientSingleton = () => {
  const log: Prisma.LogDefinition[] =
    process.env.NODE_ENV === 'development'
      ? [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
      : [{ level: 'error', emit: 'stdout' }];

  const client = new PrismaClient({
    log,
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
    transactionOptions: {
      maxWait: 10000, // max ms to wait for a connection from the pool
      timeout: 25000, // max ms a transaction can run before auto-abort
    },
  });

  // Add robust retry mechanism for all transient connection errors.
  // Uses exponential backoff: 1s, 2s, 4s between attempts.
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const MAX_RETRIES = 3;
          let lastError: unknown;

          for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
              return await query(args);
            } catch (error: unknown) {
              lastError = error;

              if (isTransientDbError(error) && attempt < MAX_RETRIES) {
                const delayMs = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                const errorMsg = error instanceof Error ? error.message : String(error);
                const errorCode = error instanceof Prisma.PrismaClientKnownRequestError
                  ? error.code
                  : 'UNKNOWN';
                console.warn(
                  `[Prisma] Transient DB error on ${model ?? 'unknown'}.${operation} ` +
                  `(code=${errorCode}, attempt=${attempt + 1}/${MAX_RETRIES + 1}): ${errorMsg.slice(0, 200)}. ` +
                  `Retrying in ${delayMs}ms...`
                );
                await new Promise(res => setTimeout(res, delayMs));
                continue;
              }

              // Non-transient error or max retries exceeded — log and rethrow.
              if (process.env.NODE_ENV === 'production') {
                const errMsg = error instanceof Error ? error.message : String(error);
                const errCode = error instanceof Prisma.PrismaClientKnownRequestError
                  ? error.code
                  : (error instanceof Prisma.PrismaClientInitializationError ? 'INIT_ERROR' : 'UNKNOWN');
                console.error(
                  JSON.stringify({
                    level: 'error',
                    event: 'PRISMA_QUERY_ERROR',
                    model: model ?? null,
                    operation,
                    code: errCode,
                    message: errMsg.slice(0, 500),
                    ts: new Date().toISOString(),
                  })
                );
              }
              throw error;
            }
          }

          throw lastError;
        },
      },
    },
  }) as unknown as PrismaClient;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobalV3: PrismaClientSingleton | undefined;
}

const prisma: PrismaClientSingleton =
  globalThis.prismaGlobalV3 ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobalV3 = prisma;
}

export default prisma;
