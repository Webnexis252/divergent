import { type NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiUnauthorized, apiServerError, apiSuccess } from "@/lib/api-response";

/**
 * GET /api/search?q=<query>
 * Full-text search across courses, lessons, and assignments.
 * Returns at most 5 results per category.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 2) {
      return apiSuccess({ courses: [], lessons: [], assignments: [] });
    }

    const [courses, lessons, assignments] = await Promise.all([
      prisma.course.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, slug: true, thumbnail: true },
        take: 5,
      }),
      prisma.lesson.findMany({
        where: {
          isPublished: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { bodyText: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          title: true,
          contentType: true,
          chapter: {
            select: {
              course: { select: { slug: true, title: true } },
            },
          },
        },
        take: 5,
      }),
      prisma.assignment.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, title: true, deadline: true },
        take: 5,
      }),
    ]);

    return apiSuccess({ courses, lessons, assignments });
  } catch (err) {
    console.error("[SEARCH_ERROR]", err);
    return apiServerError();
  }
}
