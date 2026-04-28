"use client";

import { usePathname } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import { DashboardFooter } from "./dashboard-footer";

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

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background-alt)]">
      {hideHeader ? null : <DashboardHeader />}
      <div className="flex-1">{children}</div>
      {hideFooter ? null : <DashboardFooter />}
    </div>
  );
}
