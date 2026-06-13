import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import AdminCourseDashboardUI from "./_components/AdminCourseDashboardUI";

export const dynamic = "force-dynamic";

export default async function AdminCourseDetailsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const auth = await getPageAuth();
  if (!auth || (auth.role !== "ADMIN" && auth.role !== "SUPER_ADMIN")) {
    return notFound();
  }

  const { courseId } = await params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      liveClasses: {
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          startTime: true,
          duration: true,
          meetingUrl: true,
          recordingUrl: true,
          isEnded: true,
          createdAt: true,
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          deadline: true,
          points: true,
          status: true,
          createdAt: true,
        },
      },
      tests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          status: true,
          durationMins: true,
          passingScore: true,
          createdAt: true,
          _count: { select: { questions: true, attempts: true } },
        },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  const availableTeachers = await prisma.user.findMany({
    where: {
      role: {
        in: ["MENTOR", "ADMIN", "SUPER_ADMIN"],
      },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return <AdminCourseDashboardUI initialCourse={course} availableTeachers={availableTeachers} />;
}
