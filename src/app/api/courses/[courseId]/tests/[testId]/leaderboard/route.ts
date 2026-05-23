import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiUnauthorized, apiServerError } from "@/lib/api-response";

/**
 * GET /api/courses/[courseId]/tests/[testId]/leaderboard
 *
 * Returns a ranked list of all submitted attempts for a test.
 * Ranked by score (desc), then timeSpent (asc).
 * Cached for 30s to avoid hammering DB under concurrent load.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string; testId: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { testId } = await params;

    const attempts = await prisma.testAttempt.findMany({
      where: {
        testId,
        submittedAt: { not: null },
      },
      orderBy: [
        { score: "desc" },
        { timeSpentSecs: "asc" },
      ],
      take: 100,
      select: {
        userId: true,
        score: true,
        pointsEarned: true,
        totalPoints: true,
        timeSpentSecs: true,
        gradingStatus: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // Deduplicate: keep only the best attempt per student
    const seen = new Set<string>();
    const unique = attempts.filter((a) => {
      if (seen.has(a.userId)) return false;
      seen.add(a.userId);
      return true;
    });

    const data = unique.map((a, i) => ({
      rank: i + 1,
      studentName: a.user.name ?? "Student",
      studentImage: a.user.image,
      score: a.score,
      pointsEarned: a.pointsEarned,
      totalPoints: a.totalPoints,
      timeSpentSecs: a.timeSpentSecs,
      gradingStatus: a.gradingStatus,
      isCurrentUser: a.userId === user.userId,
    }));

    return new NextResponse(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[LEADERBOARD_ERROR]", err);
    return apiServerError();
  }
}
