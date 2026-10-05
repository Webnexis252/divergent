"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SidebarNavIcon } from "./teacher-icons";
import { DashboardFrame, SidebarPanel, type SidebarItem } from "./sidebar-nav";

export const teacherNavItems = [
  { label: "Dashboard", href: "/dashboard/teacher/overview", icon: "dashboard" as const },
  { label: "Calendar", href: "/dashboard/teacher/calendar", icon: "calendar" as const },
  { label: "Doubt List", href: "/dashboard/teacher/doubt-list", icon: "doubts" as const },
  { label: "Class Control", href: "/dashboard/teacher/class-control", icon: "classes" as const },
  { label: "Assignments", href: "/dashboard/teacher/assignments", icon: "assignments" as const },
  { label: "Analytics", href: "/dashboard/teacher/analytics", icon: "analytics" as const },
  { label: "Community", href: "/dashboard/teacher/community", icon: "community" as const },
  { label: "Sketch Review", href: "/dashboard/teacher/exam-review", icon: "sketch" as const },
  { label: "Resources", href: "/dashboard/teacher/resources", icon: "resources" as const },
  { label: "Profile", href: "/dashboard/teacher/profile", icon: "profile" as const },
  { label: "Settings", href: "/dashboard/teacher/settings", icon: "settings" as const },
];

const teacherSidebarItems: SidebarItem[] = teacherNavItems.map((item) => ({
  label: item.label,
  href: item.href,
  icon: <SidebarNavIcon icon={item.icon} className="h-5 w-5 shrink-0" />,
}));

function isTeacherItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/teacher/doubt-list") {
    return pathname === "/dashboard/teacher/doubt-list" || pathname === "/dashboard/teacher/doubt-detail";
  }
  // Exact matches: their sub-paths belong to other items or have no sidebar
  if (
    href === "/dashboard/teacher/overview" ||
    href === "/dashboard/teacher/analytics" ||
    href === "/dashboard/teacher/profile" ||
    href === "/dashboard/teacher/settings"
  ) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}

/** The teacher dashboard's sidebar: the shared SidebarPanel with teacher links. */
export function TeacherSidebar() {
  const pathname = usePathname();
  return <SidebarPanel items={teacherSidebarItems} isActive={(href) => isTeacherItemActive(pathname, href)} />;
}

/**
 * Teacher pages' grid with the sidebar (used by the teacher layout), except the
 * full-screen live class control room.
 */
export function TeacherFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (/^\/dashboard\/teacher\/class-control\/[^/]+/.test(pathname)) return <>{children}</>;
  return <DashboardFrame sidebar={<TeacherSidebar />}>{children}</DashboardFrame>;
}
