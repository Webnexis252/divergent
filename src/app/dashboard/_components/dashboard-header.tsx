"use client";

import Link from "next/link";
import { Bell, ChevronDown, Search, Settings } from "lucide-react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";
import { GlobalSearch } from "./global-search";

export function DashboardHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "ST";

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 border-b border-white/80 bg-[rgba(247,246,246,0.82)] backdrop-blur-2xl"
      initial={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.26 }}
    >
      <div className="mx-auto flex max-w-[1920px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <BrandLogo href="/dashboard" size="sm" />

        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <GlobalSearch />

          <Badge tone="neutral">
            {pathname === "/dashboard" ? "Overview" : pathname.replace("/dashboard/", "").replaceAll("-", " ")}
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            aria-label="Notifications"
            className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line-soft)] bg-white/88 text-[var(--text-muted)] shadow-[var(--shadow-soft)] transition-colors duration-[var(--transition-fast)] hover:text-[var(--text-strong)]"
            type="button"
          >
            <Bell className="h-4.5 w-4.5" />
          </button>

          <Link
            className={cx(
              buttonStyles({ variant: "secondary", size: "sm" }),
              "hidden sm:inline-flex",
            )}
            href="/dashboard/settings"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--line-soft)] bg-white/88 px-1.5 py-1.5 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--line-strong)]"
          >
            {/* Avatar with purple ring — shows photo if available, else initials */}
            <div className="relative h-9 w-9 shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#925fe2] p-[2px]">
                <div className="h-full w-full overflow-hidden rounded-full bg-[var(--brand-primary-strong)]">
                  {user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={user.name ?? "avatar"}
                      src={user.image}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[13px] font-semibold text-white">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="hidden min-w-0 pr-1 sm:block">
              <p className="truncate text-[13px] font-semibold text-[var(--text-strong)]">
                {user?.name ?? "Student"}
              </p>
              <p className="truncate text-[12px] text-[var(--text-subtle)]">
                {user?.email ?? "student@divergent.in"}
              </p>
            </div>
            <ChevronDown className="mr-1 hidden h-4 w-4 text-[var(--text-subtle)] sm:block" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
