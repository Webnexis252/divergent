import { PrismaClient, Prisma } from '@prisma/client';
import { shouldRetryQuery } from '@/lib/db-retry';

/**
 * Prisma client singleton with connection-pool tuning for Vercel serverless.
 *
 * Connection limit strategy for Vercel + Supabase PgBouncer (Transaction Mode):
 *  - DATABASE_URL must point to port 6543 with ?pgbouncer=true
 *  - connection_limit=3 allows small bursts (e.g., parallel Promise.all queries)
 *    while staying well within Supabase's per-client PgBouncer limits
 *  - pool_timeout=20 prevents queries from hanging when pool is briefly full
 *
 * Retry strategy (see db-retry.ts):
 *  - Reads retry on every known Supabase/PgBouncer transient error:
 *    P1001 (can't reach server), P1017 (server closed connection),
 *    P2024 (pool timeout), ECONNRESET, ECONNREFUSED, socket hang up
 *  - Writes retry only when the query never reached Postgres, so a write
 *    that committed before its connection dropped is never run twice
 *  - 3 retries with exponential backoff (1s, 2s, 4s)
 */

/**
 * Ensures the DATABASE_URL has correct pool settings for Vercel serverless.
 * Uses connection_limit=3 to support small bursts without exhausting the DB.
 * Long-running servers (Docker / App Runner / ECS) serve many requests at once
 * and should raise it with DATABASE_CONNECTION_LIMIT (see docs/deploy-aws.md).
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
    const limit = Number.parseInt(process.env.DATABASE_CONNECTION_LIMIT ?? '', 10);
    url.searchParams.set('connection_limit', String(limit > 0 ? limit : 3));
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

  // Retry transient connection errors (writes only when they can't have run).
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

              if (shouldRetryQuery(operation, error) && attempt < MAX_RETRIES) {
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
 
