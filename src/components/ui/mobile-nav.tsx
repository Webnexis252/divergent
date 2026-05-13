"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Video, 
  MessageSquareText, 
  CircleHelp,
  NotebookPen,
  ChartNoAxesColumn,
  Award,
  UserCircle,
  CalendarDays,
  Menu,
  X,
  Users,
  BookOpen,
  Star,
  UsersRound,
  FileText,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Tag,
  Shield,
  Bell,
  ScrollText,
  Settings,
  BookCheck,
  Library,
  LogOut
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";

// Defined as constants so the Tailwind oxide scanner does not extract
// "env(safe-area-inset-bottom)" from inline string literals as a class candidate.
// (The oxide scanner reads all strings in TSX files looking for class names)
const SAFE_AREA_VAR = "env(safe-area-inset-bottom)";
const SAFE_AREA_STYLE_SM: React.CSSProperties = { paddingBottom: `max(${SAFE_AREA_VAR}, 0.8rem)` };
const SAFE_AREA_STYLE_LG: React.CSSProperties = { paddingBottom: `max(${SAFE_AREA_VAR}, 2rem)` };

// --- Configuration ---

const studentItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Live Classes", href: "/dashboard/live-classes", icon: Video },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  { label: "Doubts", href: "/dashboard/doubts", icon: CircleHelp },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
];

const teacherItems = [
  { label: "Dashboard", href: "/dashboard/teacher/overview", icon: LayoutDashboard },
  { label: "Calendar", href: "/dashboard/teacher/calendar", icon: CalendarDays },
  { label: "Doubt List", href: "/dashboard/teacher/doubt-list", icon: CircleHelp },
  { label: "Class Control", href: "/dashboard/teacher/class-control", icon: Video },
  { label: "Assignments", href: "/dashboard/teacher/assignments", icon: NotebookPen },
  { label: "Analytics", href: "/dashboard/teacher/analytics", icon: ChartNoAxesColumn },
  { label: "Community", href: "/dashboard/teacher/community", icon: MessageSquareText },
  { label: "Sketch Review", href: "/dashboard/teacher/exam-review", icon: BookCheck },
  { label: "Resources", href: "/dashboard/teacher/resources", icon: Library },
  { label: "Profile", href: "/dashboard/teacher/profile", icon: UserCircle },
];

const adminItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Mentors", href: "/admin/mentors", icon: Star },
  { label: "Cohorts", href: "/admin/cohorts", icon: UsersRound },
  { label: "Exams", href: "/admin/exams", icon: FileText },
  { label: "Live Classes", href: "/admin/live-classes", icon: Video },
  { label: "Doubts", href: "/admin/doubts", icon: MessageSquareText },
  { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert },
];

const superAdminItems = [
  { label: "Business Health", href: "/admin/super/overview", icon: TrendingUp },
  { label: "Revenue", href: "/admin/super/revenue", icon: DollarSign },
  { label: "Coupons", href: "/admin/super/coupons", icon: Tag },
  { label: "Admins", href: "/admin/super/admins", icon: Shield },
  { label: "Announcements", href: "/admin/super/announcements", icon: Bell },
  { label: "Audit Logs", href: "/admin/super/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/admin/super/settings", icon: Settings },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard" || href === "/dashboard/teacher/overview" || href === "/admin/overview") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Determine section
  let section: "student" | "teacher" | "admin" = "student";
  if (pathname.startsWith("/admin")) section = "admin";
  else if (pathname.startsWith("/dashboard/teacher")) section = "teacher";
  else section = "student";

  let items: typeof studentItems = [];
  let mainItems: typeof studentItems = [];
  let bottomBarColor = "bg-white/88 backdrop-blur-2xl";
  let activeColor = "text-[#38c1ff]";

  if (section === "admin") {
    items = [...adminItems];
    if (user?.role === "SUPER_ADMIN") {
      items = [...items, ...superAdminItems];
    }
    mainItems = items.slice(0, 3);
    activeColor = "text-(--brand-primary-strong)";
  } else if (section === "teacher") {
    items = teacherItems;
    mainItems = items.slice(0, 3);
    bottomBarColor = "bg-white/94 backdrop-blur-2xl";
    activeColor = "text-[#1b77ff]";
  } else {
    items = studentItems;
    mainItems = [
      studentItems[0], // Dashboard
      studentItems[1], // Courses
      studentItems[2], // Calendar
      studentItems[3], // Live Classes
    ];
    bottomBarColor = "bg-white/92 backdrop-blur-2xl";
    activeColor = "text-(--brand-primary-strong)";
  }

  // The bottom bar has 4 items + "Menu"
  // For admin/teacher, we have 3 + "Menu" or we can just do 4 + Menu.
  if (section !== "student") {
    mainItems = items.slice(0, 4);
  }

  // Disable body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the bottom bar on mobile */}
      <div className="h-20 lg:hidden" />

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden">
        {/* Subtle shadow gradient transitioning up into the page */}
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-[linear-gradient(to_top,rgba(0,0,0,0.04),transparent)]" />
        
        <div
          className={cx(
            "relative flex items-center justify-around px-2 pt-2.5",
            "bg-white/85 backdrop-blur-[24px] shadow-[0_-1px_0_rgba(0,0,0,0.06)]",
            section === "teacher" ? "bg-white/95" : "",
            section === "admin" ? "bg-white/90" : ""
          )}
          // Using object style to prevent Tailwind oxide from scanning env() as a class
          style={SAFE_AREA_STYLE_SM}
        >
          {mainItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;
            
            const pillColor = section === "student" ? "bg-[#38c1ff]/15" : section === "teacher" ? "bg-[#1b77ff]/15" : "bg-(--brand-primary-soft)";
            const shadowColor = section === "student" ? "rgba(56,193,255,0.4)" : section === "teacher" ? "rgba(27,119,255,0.4)" : "rgba(0,0,0,0.1)";

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group relative flex flex-1 flex-col items-center justify-center px-1"
                onClick={() => setMenuOpen(false)}
              >
                <div className="relative">
                  <motion.div
                    animate={{ scale: active ? 1.05 : 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cx(
                      "relative flex h-[32px] w-[56px] items-center justify-center rounded-full transition-colors duration-300",
                      active ? pillColor : "bg-transparent"
                    )}
                  >
                    <Icon 
                      className={cx("h-[20px] w-[20px] transition-colors duration-300", active ? activeColor : "text-[#7a7c85] group-hover:text-[#4b4c52]")} 
                      strokeWidth={active ? 2.5 : 2} 
                      style={active ? { filter: `drop-shadow(0 2px 4px ${shadowColor})` } : undefined}
                    />
                  </motion.div>
                </div>
                <span className={cx("mt-1.5 w-full text-center text-[10px] font-semibold tracking-wide transition-all duration-300", active ? cx(activeColor, "opacity-100") : "text-[#7a7c85] opacity-80 group-hover:opacity-100")}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button onClick={() => setMenuOpen(true)} className="group relative flex flex-1 flex-col items-center justify-center px-1" type="button">
            <div className="relative">
              <div className="relative flex h-[32px] w-[56px] items-center justify-center rounded-full transition-colors duration-300 bg-transparent">
                <Menu className="h-[20px] w-[20px] text-[#7a7c85] transition-colors duration-300 group-hover:text-[#4b4c52]" strokeWidth={2} />
              </div>
            </div>
            <span className="mt-1.5 w-full text-center text-[10px] font-semibold tracking-wide text-[#7a7c85] opacity-80 transition-all duration-300 group-hover:opacity-100">
              Menu
            </span>
          </button>
        </div>
      </div>

      {/* Full Screen Menu Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-[32px] border-t border-white/50 bg-[#f9fafb] px-4 pt-6 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:px-6"
              style={SAFE_AREA_STYLE_LG}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/10" />
              <div className="flex items-center justify-between pb-4 pt-2">
                <h2 className="text-[22px] font-bold tracking-tight text-[#111827]">Menu</h2>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/60 transition-colors active:bg-black/10"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto pb-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {items.map((item) => {
                    const active = isNavActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cx(
                          "group relative flex min-h-[110px] flex-col items-start justify-between rounded-[24px] p-5 transition-all active:scale-[0.97]",
                          active 
                            ? section === "student" ? "border border-[#ffe08a] bg-[#fffaf0] text-[#b45309] shadow-sm" 
                              : section === "teacher" ? "bg-blue-50 border border-blue-100 text-blue-600 shadow-sm"
                              : "bg-(--brand-primary-soft) border border-(--line-strong) text-(--brand-primary-dark) shadow-sm"
                            : "bg-white border border-[#e5e7eb] text-[#4b5563] shadow-sm active:bg-gray-50"
                        )}
                      >
                        <div className={cx(
                          "flex h-10 w-10 items-center justify-center rounded-[14px]",
                          active
                            ? section === "student" ? "bg-[#ffe08a]/30" : section === "teacher" ? "bg-blue-100" : "bg-white/50"
                            : "bg-[#f3f4f6]"
                        )}>
                          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.5 : 2} />
                        </div>
                        <span className="mt-4 text-[14px] font-semibold leading-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
                
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#fff1f2] py-4 text-[15px] font-semibold text-[#e11d48] transition-colors active:bg-[#ffe4e6] border border-[#ffe4e6]"
                    type="button"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
