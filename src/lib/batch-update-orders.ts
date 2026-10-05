import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Batch-updates the `order` field on TestQuestion rows using a single
 * raw SQL CASE statement instead of N individual UPDATE statements.
 *
 * @param updates  - Array of { id, order } tuples
 * @param tx       - Optional Prisma transaction client (use inside $transaction)
 *
 * Reduces N round trips → 1 round trip.
 * Chunks automatically at 500 rows to avoid oversized statements.
 */
export async function batchUpdateOrders(
  updates: Array<{ id: string; order: number }>,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  if (updates.length === 0) return;

  const client = tx ?? prisma;
  const CHUNK_SIZE = 500;

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    const ids = chunk.map((u) => u.id);

    await client.$executeRaw(
      Prisma.sql`
        UPDATE "TestQuestion"
        SET "order" = CASE "id"
          ${Prisma.join(
            chunk.map(({ id, order }) =>
              Prisma.sql`WHEN ${id}::uuid THEN ${order}::int`,
            ),
            ' ',
          )}
        END
        WHERE "id" = ANY(${ids}::uuid[])
      `,
    );
  }
}
