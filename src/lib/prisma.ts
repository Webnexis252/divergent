import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Prisma client singleton with connection-pool tuning for Vercel serverless.
 *
 * Connection limit strategy for Vercel + Supabase PgBouncer (Transaction Mode):
 *  - DATABASE_URL must point to port 6543 with ?pgbouncer=true
 *  - Each serverless function instance must only open 1 connection (connection_limit=1)
 *  - We enforce this at the code level by overriding the URL at runtime
 *  - pool_timeout=10 prevents queries from hanging forever if pool is busy
 */

/**
 * Ensures the DATABASE_URL has connection_limit=1 and pool_timeout=10
 * appended, which is critical for Vercel serverless environments.
 */
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  try {
    const url = new URL(baseUrl);
    // Force connection_limit=1 for serverless — each function only needs 1 connection.
    url.searchParams.set('connection_limit', '1');
    // pool_timeout: wait max 10s for a free connection before erroring.
    url.searchParams.set('pool_timeout', '10');
    return url.toString();
  } catch {
    // Fallback: if URL is malformed, return as-is
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
      maxWait: 5000,  // max ms to wait for a connection from the pool
      timeout: 15000, // max ms a transaction can run before auto-abort
    },
  });

  // Add robust retry mechanism for transient connection errors (like Supabase pooler drops)
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          let retries = 3;
          while (true) {
            try {
              return await query(args);
            } catch (error: any) {
              const isConnectionError = 
                error instanceof Prisma.PrismaClientInitializationError ||
                (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001') ||
                error.message?.includes('reach database server') ||
                error.message?.includes('timed out');
              
              if (isConnectionError && retries > 0) {
                retries -= 1;
                console.warn(`[Prisma] Connection error on ${model || 'unknown'}.${operation}, retrying... (${3 - retries}/3)`);
                await new Promise(res => setTimeout(res, 1500));
                continue;
              }
              throw error;
            }
          }
        },
      },
    },
  }) as unknown as PrismaClient;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobalV2: PrismaClientSingleton | undefined;
}

const prisma: PrismaClientSingleton =
  globalThis.prismaGlobalV2 ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobalV2 = prisma;
}

export default prisma;

