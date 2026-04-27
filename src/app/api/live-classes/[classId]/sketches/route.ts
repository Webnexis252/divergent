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
  createLiveClassSketch,
  listLiveClassSketches,
} from "@/lib/live-class-sketch-store";

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

    const sketches = await listLiveClassSketches(classId);
    return apiSuccess(sketches);
  } catch (error) {
    console.error("[LIVE_CLASS_SKETCHES_GET_ERROR]", error);
    return apiServerError();
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
    const file = formData.get("file");
    const note = String(formData.get("note") ?? "");

    if (!(file instanceof File)) {
      return apiError("Please attach an image file", 400);
    }

    if (!file.type.startsWith("image/")) {
      return apiError("Only image uploads are supported", 400);
    }

    if (file.size > 8 * 1024 * 1024) {
      return apiError("Image must be 8MB or smaller", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true },
    });

    const bytes = Buffer.from(await file.arrayBuffer());
    const sketch = await createLiveClassSketch({
      liveClassId: classId,
      studentId: auth.userId,
      studentName: user?.name ?? user?.email ?? "Student",
      note,
      fileName: file.name,
      bytes,
    });

    return apiCreated(sketch, "Sketch shared with the classroom");
  } catch (error) {
    console.error("[LIVE_CLASS_SKETCHES_POST_ERROR]", error);
    return apiServerError();
  }
}
