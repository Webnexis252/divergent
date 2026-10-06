import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { TestsView, type TestItem, type TestState } from "./TestsView";

export const dynamic = "force-dynamic";

/** The student's published tests across their active courses, with where each one stands. */
async function loadTests(userId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: "ACTIVE" },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          tests: {
            where: { status: "PUBLISHED" },
            orderBy: { publishedAt: "desc" },
            select: {
              id: true,
              title: true,
              description: true,
              durationMins: true,
              questionsToShow: true,
              availableFrom: true,
              availableUntil: true,
              publishedAt: true,
              createdAt: true,
              _count: { select: { questions: true } },
              // Only what the list shows: never the answers JSON
              attempts: {
                where: { userId },
                orderBy: { startedAt: "desc" },
                select: { score: true, isPassed: true, gradingStatus: true, submittedAt: true },
              },
            },
          },
        },
      },
    },
  });

  const now = Date.now();
  const tests: TestItem[] = enrollments.flatMap(({ course }) =>
    course.tests.map((test) => {
      const latestSubmitted = test.attempts.find((attempt) => attempt.submittedAt);
      const questionCount = Math.min(test.questionsToShow ?? Infinity, test._count.questions);
      const state: TestState = test.attempts.some((attempt) => !attempt.submittedAt)
        ? "in-progress"
        : latestSubmitted
          ? "done"
          : questionCount === 0
            ? "not-ready"
            : test.availableFrom && test.availableFrom.getTime() > now
              ? "upcoming"
              : test.availableUntil && test.availableUntil.getTime() < now
                ? "missed"
                : "available";

      return {
        id: test.id,
        title: test.title,
        description: test.description,
        durationMins: test.durationMins,
        questionCount,
        availableFrom: test.availableFrom,
        availableUntil: test.availableUntil,
        // Set for every published test by a database trigger; createdAt only guards the type
        publishedAt: test.publishedAt ?? test.createdAt,
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        state,
        result: latestSubmitted
          ? {
              score: latestSubmitted.score,
              isPassed: latestSubmitted.isPassed,
              pendingReview:
                latestSubmitted.gradingStatus === "PENDING_REVIEW" ||
                latestSubmitted.gradingStatus === "PARTIAL_A_GRADED",
            }
          : null,
      };
    }),
  );

  const courses = enrollments.map(({ course }) => ({ id: course.id, title: course.title, slug: course.slug }));
  return { courses, tests, now };
}

export default async function TestsPage() {
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) redirect("/login");

  const { courses, tests, now } = await loadTests(auth.userId);

  return <TestsView courses={courses} tests={tests} now={now} />;
}
