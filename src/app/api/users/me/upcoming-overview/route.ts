import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiServerError, apiUnauthorized, apiSuccess } from "@/lib/api-response";
import type { UpcomingOverviewResponse } from "@/lib/upcoming-overview";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["STUDENT"]);
    if (!auth) {
      return apiUnauthorized();
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: auth.userId, status: "ACTIVE" },
      select: { courseId: true },
    });

    const courseIds = enrollments.map((enrollment) => enrollment.courseId);

    if (courseIds.length === 0) {
      const empty: UpcomingOverviewResponse = {
        nextClass: null,
        nextExam: null,
        nextAssignment: null,
        counts: {
          upcomingClasses: 0,
          openExams: 0,
          pendingAssignments: 0,
        },
      };

      return apiSuccess(empty);
    }

    const now = new Date();

    const [upcomingClasses, assignmentRows, openQuizRows] = await Promise.all([
      prisma.liveClass.findMany({
        where: {
          courseId: { in: courseIds },
          startTime: { gt: now },
        },
        include: {
          course: {
            select: { title: true, slug: true },
          },
        },
        orderBy: { startTime: "asc" },
      }),
      prisma.assignment.findMany({
        where: {
          status: "ACTIVE",
          courseId: { in: courseIds },
        },
        include: {
          course: {
            select: { title: true, slug: true },
          },
          submissions: {
            where: { studentId: auth.userId },
            select: { id: true },
          },
        },
        orderBy: [{ createdAt: "asc" }],
      }),
      prisma.quiz.findMany({
        where: {
          lesson: {
            isPublished: true,
            chapter: {
              isPublished: true,
              courseId: { in: courseIds },
            },
          },
          attempts: {
            none: { userId: auth.userId },
          },
        },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              order: true,
              chapter: {
                select: {
                  order: true,
                  title: true,
                  course: {
                    select: {
                      title: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { lesson: { chapter: { order: "asc" } } },
          { lesson: { order: "asc" } },
          { createdAt: "asc" },
        ],
      }),
    ]);

    const nextClass = upcomingClasses[0]
      ? {
          id: upcomingClasses[0].id,
          title: upcomingClasses[0].title,
          courseTitle: upcomingClasses[0].course.title,
          courseSlug: upcomingClasses[0].course.slug,
          startTime: upcomingClasses[0].startTime.toISOString(),
          duration: upcomingClasses[0].duration,
          meetingUrl: upcomingClasses[0].meetingUrl,
        }
      : null;

    const pendingAssignments = assignmentRows
      .filter((assignment) => assignment.submissions.length === 0)
      .sort((left, right) => {
        if (left.deadline && right.deadline) {
          return left.deadline.getTime() - right.deadline.getTime();
        }

        if (left.deadline && !right.deadline) {
          return -1;
        }

        if (!left.deadline && right.deadline) {
          return 1;
        }

        return left.createdAt.getTime() - right.createdAt.getTime();
      });

    const nextAssignment = pendingAssignments[0]
      ? {
          id: pendingAssignments[0].id,
          title: pendingAssignments[0].title,
          courseTitle: pendingAssignments[0].course?.title ?? "General",
          courseSlug: pendingAssignments[0].course?.slug ?? null,
          deadline: pendingAssignments[0].deadline?.toISOString() ?? null,
          points: pendingAssignments[0].points,
        }
      : null;

    const nextExam = openQuizRows[0]
      ? {
          quizId: openQuizRows[0].id,
          title: openQuizRows[0].title,
          lessonId: openQuizRows[0].lesson.id,
          lessonTitle: openQuizRows[0].lesson.title,
          courseTitle: openQuizRows[0].lesson.chapter.course.title,
          courseSlug: openQuizRows[0].lesson.chapter.course.slug,
          ctaHref: `/dashboard/courses/${openQuizRows[0].lesson.chapter.course.slug}`,
          availabilityLabel: "Available now",
        }
      : null;

    const payload: UpcomingOverviewResponse = {
      nextClass,
      nextExam,
      nextAssignment,
      counts: {
        upcomingClasses: upcomingClasses.length,
        openExams: openQuizRows.length,
        pendingAssignments: pendingAssignments.length,
      },
    };

    return apiSuccess(payload);
  } catch (error) {
    console.error("[GET_UPCOMING_OVERVIEW_ERROR]", error);
    return apiServerError();
  }
}
