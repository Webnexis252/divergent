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
          startTime: true,
          recordingUrl: true,
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      },
      tests: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  return <AdminCourseDashboardUI initialCourse={course} />;
}
