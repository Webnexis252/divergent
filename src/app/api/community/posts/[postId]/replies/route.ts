import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  apiSuccess,
  apiUnauthorized,
  apiNotFound,
  apiServerError,
  apiCreated,
  apiBadRequest,
} from "@/lib/api-response";

/**
 * GET /api/community/posts/[postId]/replies
 * Returns all replies (comments) for a specific post.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { postId } = await params;

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return apiNotFound("Post");
    }

    // Fetch replies ordered by oldest first (chronological message flow)
    const replies = await prisma.postReply.findMany({
      where: { postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return apiSuccess(replies);
  } catch (err) {
    console.error("[GET_REPLIES_ERROR]", err);
    return apiServerError();
  }
}

/**
 * POST /api/community/posts/[postId]/replies
 * Creates a new reply (comment) under a post.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { postId } = await params;

    // Verify post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      return apiNotFound("Post");
    }

    const body = await req.json().catch(() => null);
    const commentBody = body?.body?.trim();

    if (!commentBody) {
      return apiBadRequest("Comment text cannot be empty");
    }

    // Create the new comment/reply
    const reply = await prisma.postReply.create({
      data: {
        postId,
        authorId: auth.userId,
        body: commentBody,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true,
          },
        },
      },
    });

    return apiCreated(reply);
  } catch (err) {
    console.error("[CREATE_REPLY_ERROR]", err);
    return apiServerError();
  }
}
