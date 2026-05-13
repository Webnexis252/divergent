"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Bell,
  BookOpen,
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Star,
  Tag,
  TrendingUp,
  Users,
  Video,
  UsersRound,
  ShieldAlert,
  ScrollText,
  FileText,
} from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";

const adminNavItems = [
  { label: "Overview", href: "/admin/overview", icon: LayoutDashboard },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Mentors", href: "/admin/mentors", icon: Star },
  { label: "Cohorts", href: "/admin/cohorts", icon: UsersRound },
  { label: "Exams", href: "/admin/exams", icon: FileText },
  { label: "Live Classes", href: "/admin/live-classes", icon: Video },
  { label: "Doubts", href: "/admin/doubts", icon: MessageSquare },
  { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert },
] as const;

const superAdminNavItems = [
  { label: "Business Health", href: "/admin/super/overview", icon: TrendingUp },
  { label: "Revenue", href: "/admin/super/revenue", icon: DollarSign },
  { label: "Coupons", href: "/admin/super/coupons", icon: Tag },
  { label: "Admins", href: "/admin/super/admins", icon: Shield },
  { label: "Announcements", href: "/admin/super/announcements", icon: Bell },
  { label: "Audit Logs", href: "/admin/super/audit-logs", icon: ScrollText },
  { label: "Settings", href: "/admin/super/settings", icon: Settings },
] as const;

function NavSection({
  items,
  markerTone,
  pathname,
  title,
}: {
  items: ReadonlyArray<{
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }>;
  markerTone: string;
  pathname: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-(--text-subtle)">
        {title}
      </p>

      <div className="space-y-1">
        {items.map((item, index) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin/overview" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.24 }}
            >
              <Link
                className={cx(
                  "group relative flex items-center gap-3 rounded-(--radius-lg) px-4 py-3 text-[15px] font-semibold tracking-[-0.01em] transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out hover:-translate-y-[1px] focus-visible:outline-none",
                  active
                    ? "border border-(--line-strong) bg-white text-(--brand-primary-dark) shadow-(--shadow-soft)"
                    : "border border-transparent text-(--text-muted) hover:bg-white/72 hover:text-(--text-strong)",
                )}
                href={item.href}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{item.label}</span>
                {active ? (
                  <span
                    className="ml-auto h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: markerTone }}
                  />
                ) : null}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="hidden min-h-screen w-[292px] flex-col border-r border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(255,255,255,0.52))] px-5 py-6 backdrop-blur-2xl lg:flex"
      initial={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="space-y-8">
        <div className="rounded-(--radius-xl) border border-white/80 bg-white/76 px-4 py-4 shadow-(--shadow-soft)">
          <BrandLogo href="/admin/overview" size="md" />
          <div className="mt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-(--text-subtle)">
                Control Room
              </p>
              <p className="mt-1 text-[15px] font-semibold text-(--text-strong)">
                {user?.name ?? "Admin workspace"}
              </p>
            </div>
            <Badge tone={isSuperAdmin ? "warning" : "brand"}>
              {isSuperAdmin ? "Owner" : "Admin"}
            </Badge>
          </div>
        </div>

        <NavSection
          items={adminNavItems}
          markerTone="var(--brand-primary-strong)"
          pathname={pathname}
          title="Operations"
        />

        {isSuperAdmin ? (
          <NavSection
            items={superAdminNavItems}
            markerTone="var(--warning)"
            pathname={pathname}
            title="Owner Controls"
          />
        ) : null}
      </div>

      <div className="mt-auto space-y-4">
        <div className="rounded-(--radius-lg) border border-(--line-soft) bg-white/72 px-4 py-4">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-(--text-subtle)">
            Focus
          </p>
          <p className="mt-3 text-[14px] leading-7 text-(--text-muted)">
            Keep the admin surfaces clear, fast to scan, and useful under load. The shell should feel like a product control layer, not a placeholder dashboard.
          </p>
        </div>

        <button
          className="flex w-full items-center gap-3 rounded-(--radius-lg) px-4 py-3 text-[15px] font-semibold tracking-[-0.01em] text-(--text-muted) transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out hover:-translate-y-[1px] hover:bg-white/72 hover:text-(--text-strong) border border-transparent focus-visible:outline-none"
          onClick={() => logout()}
          type="button"
        >
          <LogOut className="h-4.5 w-4.5" />
          <span>Logout</span>
        </button>
      </div>
    </motion.aside>
  );
}
