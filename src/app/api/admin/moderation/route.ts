import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiServerError } from '@/lib/api-response';
import { NextRequest } from 'next/server';

/**
 * GET /api/admin/moderation
 * Lists all flagged posts with pagination.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const [flaggedPosts, totalPosts, totalFlagged] = await Promise.all([
      prisma.post.findMany({
        where: { isFlagged: true },
        include: {
          author: { select: { id: true, name: true, email: true, image: true } },
          channel: { select: { id: true, name: true } },
          _count: { select: { likes: true, replies: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.post.count(),
      prisma.post.count({ where: { isFlagged: true } }),
    ]);

    return apiSuccess({ flaggedPosts, totalPosts, totalFlagged });
  } catch (err) {
    console.error('[MODERATION_GET_ERROR]', err);
    return apiServerError();
  }
}
