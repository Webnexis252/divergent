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

    const { postId } = await ctx.params;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, isFlagged: true, flagReason: true },
    });

    if (!post) return apiNotFound("Post");

    const isOwner = post.authorId === auth.userId;
    const isModerator = canModerate(auth.role);

    if (!isOwner && !isModerator) {
      return apiForbidden("You do not have permission to update this post.");
    }

    const body = await req.json().catch(() => null);
    if (!body) return apiBadRequest("No data provided");

    const hasIsFlagged = typeof body.isFlagged === "boolean";
    const hasFlagReason = typeof body.flagReason === "string" || body.flagReason === null;
    const isEditingContent = typeof body.title === "string" || typeof body.body === "string" || typeof body.imageUrl === "string";

    if (isEditingContent) {
      if (!isOwner) {
        return apiForbidden("Only the author can edit the post content.");
      }

      const { title, body: postBody, imageUrl } = body;
      const dataToUpdate: { title?: string; body?: string; imageUrl?: string | null } = {};
      if (typeof title === "string") {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return apiBadRequest("Title cannot be empty");
        dataToUpdate.title = trimmedTitle;
      }
      if (typeof postBody === "string") {
        const trimmedBody = postBody.trim();
        dataToUpdate.body = trimmedBody;
      }
      if (typeof imageUrl === "string") {
        const trimmedImageUrl = imageUrl.trim();
        if (trimmedImageUrl && !/^https?:\/\//.test(trimmedImageUrl)) {
          return apiBadRequest("Post image must be a valid URL");
        }
        dataToUpdate.imageUrl = trimmedImageUrl || null;
      }

      const updated = await prisma.post.update({
        where: { id: postId },
        data: dataToUpdate,
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
        }
      });

      return apiSuccess({
        id: updated.id,
        title: updated.title,
        body: updated.body,
        imageUrl: updated.imageUrl,
        createdAt: updated.createdAt,
        author: updated.author,
        channel: updated.channel,
        replyCount: updated._count.replies,
        likeCount: updated._count.likes,
        likedByMe: updated.likes.length > 0,
        replyTo: updated.replyTo ? {
          id: updated.replyTo.id,
          title: updated.replyTo.title,
          body: updated.replyTo.body,
          author: updated.replyTo.author
        } : null,
      }, "Post updated successfully");
    }

    if (!isModerator) {
      return apiForbidden("Only admins can moderate community posts.");
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
