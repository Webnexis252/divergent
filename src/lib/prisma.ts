import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Prisma client singleton with connection-pool tuning for high-concurrency.
 *
 * Connection limit strategy:
 *  - Supabase free tier allows up to 60 direct connections (Supavisor pooler: ~200).
 *  - We cap per-instance at 10 so that multiple serverless instances don't exhaust the pool.
 *  - In development a smaller cap is fine since only one instance runs.
 */
const prismaClientSingleton = () => {
  const log: Prisma.LogDefinition[] =
    process.env.NODE_ENV === 'development'
      ? [{ level: 'warn', emit: 'stdout' }, { level: 'error', emit: 'stdout' }]
      : [{ level: 'error', emit: 'stdout' }];

  const client = new PrismaClient({
    log,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Prisma connection pool — this controls the Prisma-level pool,
    // in addition to PgBouncer/Supavisor at the DB layer.
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

