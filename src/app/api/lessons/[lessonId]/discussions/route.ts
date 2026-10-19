import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, type JwtPayload } from "@/lib/auth";
import { courseRelation } from "@/lib/course-access";
import { apiSuccess, apiUnauthorized, apiServerError, apiError, apiForbidden } from "@/lib/api-response";

type Props = { params: Promise<{ lessonId: string }> };

const MAX_MESSAGE_LENGTH = 2000;

/**
 * Who can take part in a lesson's discussion: students enrolled in the course
 * and its teachers. A free-preview lesson's discussion can also be read by
 * anyone signed in, like the lesson itself, but only the course's own people
 * can post.
 */
async function discussionAccess(auth: JwtPayload, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { title: true, isFreePreview: true, chapter: { select: { courseId: true } } },
  });
  if (!lesson) return null;

  const relation = await courseRelation(auth, lesson.chapter.courseId);
  return {
    lesson,
    canRead: relation !== "none" || lesson.isFreePreview,
    canPost: relation !== "none",
  };
}

/**
 * GET /api/lessons/[lessonId]/discussions
 * Returns all discussion messages for a given lesson.
 */
export async function GET(req: NextRequest, { params }: Props) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { lessonId } = await params;
    const access = await discussionAccess(auth, lessonId);
    if (!access) return apiError("Lesson not found", 404);
    if (!access.canRead) return apiForbidden("Enroll in this course to see its discussions");

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
    const body = (await req.json().catch(() => ({}))) as { body?: unknown };
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (!text) {
      return apiError("Message body is required", 400);
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      return apiError(`Messages can be at most ${MAX_MESSAGE_LENGTH} characters`, 400);
    }

    const access = await discussionAccess(auth, lessonId);
    if (!access) return apiError("Lesson not found", 404);
    if (!access.canPost) return apiForbidden("Enroll in this course to join its discussions");

    const channelName = `lesson_${lessonId}`;

    // Get or create the channel for this lesson
    let channel = await prisma.channel.findFirst({
      where: { name: channelName },
    });

    if (!channel) {
      channel = await prisma.channel.create({
        data: {
          name: channelName,
          description: `Discussion for lesson: ${access.lesson.title}`,
          type: "TEXT",
        },
      });
    }

    const message = await prisma.message.create({
      data: {
        channelId: channel.id,
        authorId: auth.userId,
        body: text,
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
