"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { SidebarNavIcon } from "./teacher-icons";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

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

export function TeacherSidebar() {
  const pathname = usePathname();

  const isItemActive = (href: string) => {
    if (href === "/dashboard/teacher/doubt-list") {
      return (
        pathname === "/dashboard/teacher/doubt-list" ||
        pathname === "/dashboard/teacher/doubt-detail"
      );
    }

    if (href === "/dashboard/teacher/analytics") {
      return pathname === "/dashboard/teacher/analytics";
    }

    if (href === "/dashboard/teacher/calendar") {
      return pathname.startsWith("/dashboard/teacher/calendar");
    }

    if (href === "/dashboard/teacher/class-control") {
      return pathname.startsWith("/dashboard/teacher/class-control");
    }

    if (href === "/dashboard/teacher/assignments") {
      return pathname.startsWith("/dashboard/teacher/assignments");
    }

    if (href === "/dashboard/teacher/exam-review") {
      return pathname.startsWith("/dashboard/teacher/exam-review");
    }

    if (href === "/dashboard/teacher/resources") {
      return pathname.startsWith("/dashboard/teacher/resources");
    }

    if (href === "/dashboard/teacher/community") {
      return pathname.startsWith("/dashboard/teacher/community");
    }

    if (href === "/dashboard/teacher/overview") {
      return pathname === "/dashboard/teacher/overview";
    }
    
    if (href === "/dashboard/teacher/profile") {
      return pathname === "/dashboard/teacher/profile";
    }

    if (href === "/dashboard/teacher/settings") {
      return pathname === "/dashboard/teacher/settings";
    }

    return false;
  };

  return (
    <aside className="lg:sticky lg:top-[96px] lg:self-start">
      <div className="hidden">
        {teacherNavItems.map((item) => {
          const isActive = isItemActive(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
            >
              <motion.div
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? "border-[#1b77ff] bg-[#38c1ff] text-white"
                    : "border-[#dfdfdf] bg-white text-[#434343]"
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
              >
                <SidebarNavIcon icon={item.icon} className="h-4 w-4" />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </div>

      <motion.div
        className="relative hidden overflow-hidden rounded-r-[60px] bg-[#ffc107] px-7 py-10 shadow-[0_24px_60px_rgba(255,193,7,0.2)] lg:block lg:min-h-[900px] lg:w-[300px]"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_10%,rgba(255,255,255,0.35),transparent_60%)]" />

        <div className="relative z-10 pt-12">
          {teacherNavItems.map((item) => {
            const isActive = isItemActive(item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
              >
                <motion.div
                  className={`flex items-center gap-4 rounded-l-[38px] px-5 py-4 text-[22px] font-medium tracking-[-0.02em] transition ${
                    isActive
                      ? "border border-[#1b77ff]/30 bg-white/35 shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset]"
                      : "text-black/90 hover:bg-white/10"
                  }`}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.18 }}
                >
                  <SidebarNavIcon icon={item.icon} className="h-6 w-6" />
                  {item.label}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </aside>
  );
}
