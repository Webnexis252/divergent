import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { ModulesView } from "./ModulesView";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: auth.userId, status: "ACTIVE" },
    // Most recently studied course first: lesson progress updates the enrollment
    orderBy: { updatedAt: "desc" },
    select: {
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          teacherResources: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, fileUrl: true, type: true, createdAt: true },
          },
          chapters: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              lessons: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                select: { id: true, title: true, durationMins: true, contentType: true },
              },
            },
          },
        },
      },
    },
  });

  const courses = enrollments.map((enrollment) => enrollment.course);
  const lessonIds = courses.flatMap((course) => course.chapters.flatMap((chapter) => chapter.lessons.map((l) => l.id)));
  const completed = new Set(
    lessonIds.length > 0
      ? (
          await prisma.lessonProgress.findMany({
            where: { userId: auth.userId, isCompleted: true, lessonId: { in: lessonIds } },
            select: { lessonId: true },
          })
        ).map((row) => row.lessonId)
      : [],
  );

  return <ModulesView courses={courses} completed={completed} />;
}
