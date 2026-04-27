"use client";

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
  Library
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";

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
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Determine section
  let section: "student" | "teacher" | "admin" = "student";
  if (pathname.startsWith("/admin")) section = "admin";
  else if (pathname.startsWith("/dashboard/teacher")) section = "teacher";
  else section = "student";

  let items: typeof studentItems = [];
  let mainItems: typeof studentItems = [];
  let bottomBarColor = "bg-white/85 backdrop-blur-2xl";
  let activeColor = "text-[#38c1ff]";

  if (section === "admin") {
    items = [...adminItems];
    if (user?.role === "SUPER_ADMIN") {
      items = [...items, ...superAdminItems];
    }
    mainItems = items.slice(0, 3);
    activeColor = "text-[var(--brand-primary-strong)]";
  } else if (section === "teacher") {
    items = teacherItems;
    mainItems = items.slice(0, 3);
    bottomBarColor = "bg-white/95 backdrop-blur-xl border-t border-[#f0f0f0]";
    activeColor = "text-[#1b77ff]";
  } else {
    items = studentItems;
    mainItems = [
      studentItems[0], // Dashboard
      studentItems[1], // Courses
      studentItems[2], // Calendar
      studentItems[3], // Live Classes
    ];
    bottomBarColor = "bg-white/90 backdrop-blur-2xl border-t border-black/5";
    activeColor = "text-[#f97316]"; // Match student vibe
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
      <div className={cx("fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around pb-safe pt-2 lg:hidden shadow-[0_-4px_24px_rgba(0,0,0,0.06)]", bottomBarColor)}>
        {mainItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center w-16 h-14 group"
              onClick={() => setMenuOpen(false)}
            >
              <motion.div
                animate={{ y: active ? -2 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon className={cx("w-6 h-6 mb-1 transition-colors", active ? activeColor : "text-gray-400 group-hover:text-gray-600")} strokeWidth={active ? 2.5 : 2} />
              </motion.div>
              <span className={cx("text-[10px] font-semibold tracking-wide transition-colors", active ? activeColor : "text-gray-500")}>
                {item.label}
              </span>
              {active && (
                <motion.div layoutId="bottomNavIndicator" className={cx("absolute bottom-0 w-8 h-1 rounded-t-full", section === "student" ? "bg-[#f97316]" : section === "teacher" ? "bg-[#1b77ff]" : "bg-[var(--brand-primary-strong)]")} />
              )}
            </Link>
          );
        })}

        <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center justify-center w-16 h-14 group">
          <Menu className="w-6 h-6 mb-1 text-gray-400 group-hover:text-gray-600" strokeWidth={2} />
          <span className="text-[10px] font-semibold tracking-wide text-gray-500">Menu</span>
        </button>
      </div>

      {/* Full Screen Menu Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[32px] bg-white px-6 pb-24 pt-8 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-gray-200" />
              <button 
                onClick={() => setMenuOpen(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-transform"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight">Navigation</h2>
              
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => {
                  const active = isNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cx(
                        "flex flex-col items-start p-4 rounded-[20px] transition-all",
                        active 
                          ? section === "student" ? "bg-orange-50 border border-orange-100 text-orange-600" 
                            : section === "teacher" ? "bg-blue-50 border border-blue-100 text-blue-600"
                            : "bg-[var(--brand-primary-muted)] border border-[var(--brand-primary-light)] text-[var(--brand-primary-dark)]"
                          : "bg-gray-50 border border-gray-100 text-gray-600 active:bg-gray-100"
                      )}
                    >
                      <Icon className="w-6 h-6 mb-3" strokeWidth={active ? 2.5 : 2} />
                      <span className="text-[13px] font-semibold">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
