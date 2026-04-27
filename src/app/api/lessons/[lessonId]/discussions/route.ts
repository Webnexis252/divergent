import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiUnauthorized, apiServerError, apiError } from "@/lib/api-response";

type Props = { params: Promise<{ lessonId: string }> };

/**
 * GET /api/lessons/[lessonId]/discussions
 * Returns all discussion messages for a given lesson.
 */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { lessonId } = await params;

    const channelName = `lesson_${lessonId}`;

    // Find or return empty if no channel yet
    const channel = await prisma.channel.findFirst({
      where: { name: channelName },
    });

    if (!channel) {
      return apiSuccess({ messages: [] });
    }

    const messages = await prisma.message.findMany({
      where: { channelId: channel.id },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });

    return apiSuccess({ messages });
  } catch (err) {
    console.error("[GET_LESSON_DISCUSSIONS_ERROR]", err);
    return apiServerError();
  }
}

/**
 * POST /api/lessons/[lessonId]/discussions
 * Post a new message to a lesson's discussion channel.
 * Auto-creates the channel if it doesn't exist yet.
 */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { lessonId } = await params;
    const body = (await req.json()) as { body?: string };

    if (!body.body?.trim()) {
      return apiError("Message body is required", 400);
    }

    // Verify the lesson exists
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return apiError("Lesson not found", 404);

    const channelName = `lesson_${lessonId}`;

    // Get or create the channel for this lesson
    let channel = await prisma.channel.findFirst({
      where: { name: channelName },
    });

    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          name: channelName,
          description: `Discussion for lesson: ${lesson.title}`,
          type: "TEXT",
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        channelId: channel.id,
        authorId: auth.userId,
        body: body.body.trim(),
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: {
          select: { id: true, name: true, image: true, role: true },
        },
      },
    });

    return apiSuccess({ message });
  } catch (err) {
    console.error("[POST_LESSON_DISCUSSION_ERROR]", err);
    return apiServerError();
  }
}
