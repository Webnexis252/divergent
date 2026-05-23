import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiUnauthorized,
  apiServerError,
} from '@/lib/api-response';
import { checkRateLimit, getCachedUser, getCachedChannel } from '@/lib/community-queue';
import { COMMUNITY_POST_XP_COST, spendStudentXp } from '@/lib/xp';

/**
 * GET /api/community/posts
 * Returns recent community posts with author, channel, reply count, and like count.
 * Also returns popular channels for the sidebar.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId') ?? undefined;
    const cursor = searchParams.get('cursor') ?? undefined;
    const take = 10;

    const posts = await prisma.post.findMany({
      where: channelId ? { channelId } : {},
      include: {
        author: { select: { id: true, name: true, image: true, role: true } },
        channel: { select: { id: true, name: true } },
        _count: { select: { replies: true, likes: true } },
        likes: {
          where: { userId: auth.userId },
          select: { id: true },
        },
        replyTo: {
          include: {
            author: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    // Trending channels — sorted by number of posts
    const channels = await prisma.channel.findMany({
      where: { isPrivate: false },
      include: { _count: { select: { posts: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const formattedPosts = posts.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      author: p.author,
      channel: p.channel,
      replyCount: p._count.replies,
      likeCount: p._count.likes,
      likedByMe: p.likes.length > 0,
      replyTo: p.replyTo ? {
        id: p.replyTo.id,
        title: p.replyTo.title,
        body: p.replyTo.body,
        author: p.replyTo.author
      } : null,
    }));

    const nextCursor =
      posts.length === take ? posts[posts.length - 1].id : null;

    return apiSuccess({
      posts: formattedPosts,
      nextCursor,
      channels: channels.map((c) => ({
        id: c.id,
        name: c.name,
        postCount: c._count.posts,
      })),
    });
  } catch (err) {
    console.error('[GET_POSTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/community/posts
 * Creates a new community post.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    // 1. Enforce Rate Limiting (Prevents flood crashes)
    if (!checkRateLimit(auth.userId)) {
      return apiError('Too many requests. Please slow down.', 429);
    }

    const body = await req.json();
    const { title, postBody, channelId, imageUrl, replyToId } = body;
    const trimmedTitle = title?.trim();
    const trimmedBody = postBody?.trim() ?? '';
    const trimmedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';

    if (!trimmedTitle) {
      return apiError('Title is required', 400);
    }

    if (!trimmedBody && !trimmedImageUrl) {
      return apiError('Add some text or an image before posting', 400);
    }

    if (trimmedImageUrl && !/^https?:\/\//.test(trimmedImageUrl)) {
      return apiError('Post image must be a valid URL', 400);
    }

    const post = await prisma.$transaction(async (tx) => {
      if (auth.role === 'STUDENT') {
        const spent = await spendStudentXp(auth.userId, COMMUNITY_POST_XP_COST, tx);
        if (!spent) return null;
      }

      return tx.post.create({
        data: {
          title: trimmedTitle,
          body: trimmedBody,
          imageUrl: trimmedImageUrl || null,
          authorId: auth.userId,
          channelId: channelId ?? null,
          replyToId: replyToId || null,
        },
      });
    });

    if (!post) {
      return apiError(
        `You need at least ${COMMUNITY_POST_XP_COST} XP to create a community post.`,
        403,
      );
    }

    // 3. Construct optimistic response using in-memory cached user & channel
    const author = await getCachedUser(auth.userId);
    const channel = await getCachedChannel(channelId ?? null);

    // Fetch parent reply info if replyToId is present
    const replyTo = replyToId ? await prisma.post.findUnique({
      where: { id: replyToId },
      include: { author: { select: { id: true, name: true } } }
    }) : null;

    return apiCreated({
      id: post.id,
      title: post.title,
      body: post.body,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      author: author ?? { id: auth.userId, name: 'Unknown', image: null, role: auth.role },
      channel: channel ?? null,
      replyCount: 0,
      likeCount: 0,
      likedByMe: false,
      replyTo: replyTo ? {
        id: replyTo.id,
        title: replyTo.title,
        body: replyTo.body,
        author: replyTo.author
      } : null,
    });
  } catch (err) {
    console.error('[CREATE_POST_ERROR]', err);
    return apiServerError();
  }
}
