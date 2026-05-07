"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Video,
  ChartNoAxesColumn,
  CircleHelp,
  House,
  LogOut,
  MessageSquareText,
  NotebookPen,
  UserCircle,
  Award,
  CalendarDays,
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";

import { studentNavItems } from "./nav-items";

// Determines if a nav item's href is active given the current pathname
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  if (href === "/dashboard/teacher/overview") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = studentNavItems;
  const workspaceLabel = "Student Workspace";

  return (
    <aside className="hidden relative overflow-hidden bg-[linear-gradient(180deg,#ffc107_0%,#ffca28_100%)] text-[#111827] px-4 py-6 lg:min-h-screen lg:px-5 lg:py-8 lg:rounded-tr-[40px] shadow-[2px_0_24px_rgba(255,193,7,0.15)] lg:flex flex-col">
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-8 px-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-black/40">
            {workspaceLabel}
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <motion.div
                key={item.href}
                transition={{ duration: 0.18 }}
                whileHover={{ x: 4 }}
              >
                <Link
                  className={cx(
                    "group relative flex items-center gap-4 rounded-[22px] px-5 py-3.5 text-[16px] xl:text-[18px] font-medium tracking-wide transition-[background-color,color] duration-[var(--transition-fast)] ease-[var(--ease-standard)]",
                    active
                      ? "bg-white/30 text-black shadow-[0_4px_10px_rgba(0,0,0,0.03)]"
                      : "bg-transparent text-black/80 hover:bg-white/10 hover:text-black",
                  )}
                  href={item.href}
                >
                  <Icon className="h-[22px] w-[22px] stroke-[1.75]" />
                  <span>{item.label}</span>
                  
                  {item.label === "Community" && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5 rounded-full bg-[#e11d48]" />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <button
            className="flex w-full items-center gap-4 rounded-[22px] px-5 py-3.5 text-left text-[16px] xl:text-[18px] font-medium text-black/80 transition-[background-color,color] duration-[var(--transition-fast)] hover:bg-white/10 hover:text-black"
            onClick={() => logout()}
            type="button"
          >
            <LogOut className="h-[22px] w-[22px] stroke-[1.75]" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}

