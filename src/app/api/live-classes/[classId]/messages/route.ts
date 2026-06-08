import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getAccessibleLiveClassForUser } from "@/lib/live-class-service";
import {
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiSuccess,
  apiUnauthorized,
} from "@/lib/api-response";
import {
  createLiveClassMessage,
  listLiveClassMessages,
} from "@/lib/live-class-message-store";

type Params = { params: Promise<{ classId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { classId } = await params;
    const { liveClass, canAccess } = await getAccessibleLiveClassForUser({
      classId,
      userId: auth.userId,
      role: auth.role,
    });

    if (!liveClass) return apiNotFound("Live class");
    if (!canAccess) return apiForbidden("You do not have access to this classroom");

    const messages = await listLiveClassMessages(classId);
    const response = apiSuccess(messages);
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (error) {
    console.error("[LIVE_CLASS_MESSAGES_GET_ERROR]", error);
    return apiError(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { classId } = await params;
    const { liveClass, canAccess } = await getAccessibleLiveClassForUser({
      classId,
      userId: auth.userId,
      role: auth.role,
    });

    if (!liveClass) return apiNotFound("Live class");
    if (!canAccess) return apiForbidden("You do not have access to this classroom");

    const formData = await req.formData();
    const body = String(formData.get("body") ?? "");
    const file = formData.get("file");

    if (!body.trim() && !(file instanceof File)) {
      return apiError("Add a message or attach an image", 400);
    }

    if (file instanceof File && !file.type.startsWith("image/")) {
      return apiError("Only image uploads are supported", 400);
    }

    if (file instanceof File && file.size > 8 * 1024 * 1024) {
      return apiError("Image must be 8MB or smaller", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true, role: true },
    });

    const bytes =
      file instanceof File ? Buffer.from(await file.arrayBuffer()) : null;

    const message = await createLiveClassMessage({
      liveClassId: classId,
      senderId: auth.userId,
      senderName: user?.name ?? user?.email ?? "User",
      senderRole: user?.role ?? auth.role,
      body,
      fileName: file instanceof File ? file.name : null,
      bytes,
    });

    return apiCreated(message, "Message sent");
  } catch (error) {
    console.error("[LIVE_CLASS_MESSAGES_POST_ERROR]", error);
    return apiError(error instanceof Error ? error.message : 'Internal server error', 500);
  }
}
