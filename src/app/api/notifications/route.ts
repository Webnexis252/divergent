import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiUnauthorized, apiServerError } from "@/lib/api-response";

/**
 * GET /api/notifications
 * Returns the 30 most recent notifications for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const notifications = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        body: true,
        type: true,
        isRead: true,
        actionUrl: true,
        createdAt: true,
      },
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return apiSuccess({ notifications, unreadCount });
  } catch (err) {
    console.error("[GET_NOTIFICATIONS_ERROR]", err);
    return apiServerError();
  }
}

/**
 * PATCH /api/notifications
 * Mark one or all notifications as read.
 * Body: { id: string } — marks a single notification
 * Body: { markAll: true } — marks all as read
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const body = (await req.json()) as { id?: string; markAll?: boolean };

    if (body.markAll) {
      await prisma.notification.updateMany({
        where: { userId: auth.userId, isRead: false },
        data: { isRead: true },
      });
      return apiSuccess({ marked: "all" });
    }

    if (body.id) {
      await prisma.notification.updateMany({
        where: { id: body.id, userId: auth.userId },
        data: { isRead: true },
      });
      return apiSuccess({ marked: body.id });
    }

    return NextResponse.json({ error: "Provide id or markAll" }, { status: 400 });
  } catch (err) {
    console.error("[PATCH_NOTIFICATIONS_ERROR]", err);
    return apiServerError();
  }
}
