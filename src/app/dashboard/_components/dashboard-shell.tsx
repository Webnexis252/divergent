"use client";

import { usePathname } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { DashboardFooter } from "./dashboard-footer";
import { DashboardFrame, DashboardSidebar } from "./sidebar-nav";

// Full-screen student pages without the sidebar: the lesson player, course
// tests and exams (taking and results), and the live classroom / recording.
const NO_SIDEBAR_ROUTES = [
  /^\/dashboard\/courses\/[^/]+\/(lessons|tests|exams)(\/|$)/,
  /^\/dashboard\/live-classes\/[^/]+(\/|$)/,
  /^\/dashboard\/typography-test$/,
];

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTeacherRoute = pathname.startsWith("/dashboard/teacher/");
  const isImmersiveStudentRoute = false; // Always show header for consistency as requested
  const isAssessmentTakeRoute = /^\/dashboard\/courses\/[^/]+\/tests\/[^/]+$/.test(pathname);
  const isStandaloneStudentOverview = pathname === "/dashboard";
  const isStandaloneStudentCourses = pathname === "/dashboard/courses";
  const isStandaloneStudentCourseDetail = /^\/dashboard\/courses\/[^/]+$/.test(pathname);
  const isStandaloneStudentAssignments = pathname.startsWith("/dashboard/assignments");
  const isStandaloneStudentProfile = pathname === "/dashboard/profile";
  const hideHeader =
    isTeacherRoute ||
    isImmersiveStudentRoute;
  const hideFooter = isAssessmentTakeRoute;
  // Teacher pages get their sidebar from the teacher layout (below its top bar)
  const showStudentSidebar = !isTeacherRoute && !NO_SIDEBAR_ROUTES.some((route) => route.test(pathname));

  return (
    <div className="flex min-h-screen flex-col bg-(--background-alt)">
      {hideHeader ? null : <DashboardHeader />}
      <div className="flex-1">
        {showStudentSidebar ? (
          <DashboardFrame sidebar={<DashboardSidebar />}>{children}</DashboardFrame>
        ) : (
          children
        )}
      </div>
      {hideFooter ? null : <DashboardFooter />}
    </div>
  );
}
