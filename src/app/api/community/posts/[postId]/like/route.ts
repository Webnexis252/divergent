import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

/**
 * POST /api/community/posts/[postId]/like
 * Toggles the current user's like status on a post.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { postId } = await params;

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) return apiNotFound('Post');

    // Check if like exists
    const existingLike = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: auth.userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      return apiSuccess({ liked: false });
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          postId,
          userId: auth.userId,
        },
      });
      return apiSuccess({ liked: true });
    }
  } catch (err) {
    console.error('[TOGGLE_LIKE_ERROR]', err);
    return apiServerError();
  }
}
