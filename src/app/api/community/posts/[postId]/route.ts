import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  apiBadRequest,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import { logAudit } from "@/lib/audit-logger";

function canModerate(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * PATCH /api/community/posts/[postId]
 * Supports moderation updates like clearing a flag.
 */
export async function PATCH(
  req: NextRequest,
  ctx: RouteContext<"/api/community/posts/[postId]">,
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    if (!canModerate(auth.role)) {
      return apiForbidden("Only admins can moderate community posts.");
    }

    const { postId } = await ctx.params;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, isFlagged: true, flagReason: true },
    });

    if (!post) return apiNotFound("Post");

    const body = await req.json().catch(() => null);
    const hasIsFlagged = typeof body?.isFlagged === "boolean";
    const hasFlagReason =
      typeof body?.flagReason === "string" || body?.flagReason === null;

    if (!hasIsFlagged && !hasFlagReason) {
      return apiBadRequest("No valid moderation fields were provided.");
    }

    const nextFlagged = hasIsFlagged ? Boolean(body.isFlagged) : post.isFlagged;
    const nextFlagReason = hasFlagReason
      ? body.flagReason?.trim() || null
      : nextFlagged
        ? post.flagReason
        : null;

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        isFlagged: nextFlagged,
        flagReason: nextFlagged ? nextFlagReason : null,
      },
      select: {
        id: true,
        isFlagged: true,
        flagReason: true,
      },
    });

    if (post.isFlagged !== updated.isFlagged || post.flagReason !== updated.flagReason) {
      await logAudit({
        actorId: auth.userId,
        action: "POST_FLAGGED",
        entityType: "Post",
        entityId: updated.id,
        details: {
          previousFlagged: post.isFlagged,
          nextFlagged: updated.isFlagged,
          previousReason: post.flagReason,
          nextReason: updated.flagReason,
        },
      });
    }

    return apiSuccess(updated, updated.isFlagged ? "Post updated" : "Post approved");
  } catch (err) {
    console.error("[PATCH_COMMUNITY_POST_ERROR]", err);
    return apiServerError();
  }
}

/**
 * DELETE /api/community/posts/[postId]
 * Authors can delete their own post. Admins and super admins can delete any post.
 */
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/community/posts/[postId]">,
) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { postId } = await ctx.params;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        title: true,
        authorId: true,
      },
    });

    if (!post) return apiNotFound("Post");

    const isOwner = post.authorId === auth.userId;
    const isModerator = canModerate(auth.role);

    if (!isOwner && !isModerator) {
      return apiForbidden("You do not have permission to delete this post.");
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    if (isModerator && !isOwner) {
      await logAudit({
        actorId: auth.userId,
        action: "POST_DELETED",
        entityType: "Post",
        entityId: post.id,
        details: {
          title: post.title,
          authorId: post.authorId,
          moderated: true,
        },
      });
    }

    return apiSuccess({ id: post.id }, "Post deleted");
  } catch (err) {
    console.error("[DELETE_COMMUNITY_POST_ERROR]", err);
    return apiServerError();
  }
}
