import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiForbidden, apiServerError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!user) return apiForbidden("Unauthorized");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const overdueAttempts = await prisma.testAttempt.findMany({
      where: {
        gradingStatus: "PENDING_REVIEW",
        submittedAt: { lt: twentyFourHoursAgo }
      },
      include: {
        user: { select: { name: true, email: true } },
        test: {
          include: {
            course: {
              include: {
                teachers: { select: { name: true, email: true } }
              }
            }
          }
        }
      },
      orderBy: { submittedAt: "asc" }
    });

    const formatted = overdueAttempts.map(attempt => ({
      attemptId: attempt.id,
      studentName: attempt.user.name || attempt.user.email,
      courseTitle: attempt.test.course.title,
      examTitle: attempt.test.title,
      submittedAt: attempt.submittedAt,
      assignedTeachers: attempt.test.course.teachers.map(t => t.name || t.email),
    }));

    return apiSuccess({ overdueReviews: formatted });
  } catch (err) {
    console.error("[OVERDUE_REVIEWS_GET_ERROR]", err);
    return apiServerError();
  }
}
