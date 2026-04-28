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
      className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur-xl"
      initial={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.26 }}
    >
      <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandLogo href="/dashboard" size="sm" />

        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <GlobalSearch />
          <Badge tone="neutral">
            {pathname === "/dashboard" ? "Overview" : pathname.replace("/dashboard/", "").replaceAll("-", " ")}
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            aria-label="Notifications"
            className="grid h-10 w-10 place-items-center rounded-full border border-gray-100 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            type="button"
          >
            <Bell className="h-5 w-5" />
          </button>

          <Link
            className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-100 bg-white px-4 text-[14px] font-semibold text-[#0f172a] shadow-sm transition-colors hover:bg-gray-50"
            href="/dashboard/profile"
          >
            <Settings className="h-4.5 w-4.5" />
            <span className="sm:inline">Settings</span>
          </Link>

          <Link
            href="/dashboard/profile"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#925fe2] shadow-sm ring-1 ring-gray-100"
          >
            <span className="text-[14px] font-bold text-white">
              {initials}
            </span>
          </Link>

          <div className="hidden min-w-0 pr-1 lg:block">
            <p className="truncate text-[13px] font-semibold text-[var(--text-strong)]">
              {user?.name ?? "Student"}
            </p>
            <p className="truncate text-[12px] text-[var(--text-subtle)]">
              {user?.email ?? "student@divergent.in"}
            </p>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
