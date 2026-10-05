"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

import { studentNavItems } from "./nav-items";

export type SidebarItem = {
  label: string;
  href: string;
  icon: ReactNode;
};

// Determines if a nav item's href is active given the current pathname
function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  if (href === "/dashboard/teacher/overview") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * The one sidebar panel used by both the student and the teacher dashboards,
 * so every page shows the same shape: a sticky, full-height yellow column
 * rounded on the right. Rendered by the layouts (see DashboardFrame), never by
 * individual pages, so no page's own grid or padding can move or resize it.
 * Hidden below `lg`, where MobileNav takes over.
 */
export function SidebarPanel({
  items,
  isActive,
}: {
  items: SidebarItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    // Sticks just below the sticky header (whose height the header publishes
    // as --app-header-height) so the first links never slide underneath it.
    <div className="scrollbar-none hidden py-6 pr-7 lg:sticky lg:top-(--app-header-height) lg:block lg:h-[calc(100vh-var(--app-header-height))] lg:overflow-y-auto">
      <aside className="min-h-[calc(100vh-var(--app-header-height)-48px)] rounded-r-[40px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-7 py-12 shadow-[0_18px_48px_rgba(254,198,0,0.18)]">
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                className={cx(
                  "flex min-h-[56px] items-center gap-4 rounded-[22px] px-5 py-3 text-[18px] font-medium text-black transition-colors duration-150",
                  active ? "bg-white/40 shadow-sm" : "hover:bg-white/20",
                )}
                href={item.href}
                prefetch={true}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

const studentSidebarItems: SidebarItem[] = studentNavItems.map((item) => {
  const Icon = item.icon;
  return { label: item.label, href: item.href, icon: <Icon className="h-5 w-5 shrink-0" /> };
});

export function DashboardSidebar() {
  const pathname = usePathname();
  return <SidebarPanel items={studentSidebarItems} isActive={(href) => isNavActive(pathname, href)} />;
}

/**
 * Page grid with the sidebar column on the left (280px, including the 28px
 * gap to the content) and the page in the remaining space.
 */
export function DashboardFrame({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-[1920px] lg:grid-cols-[280px_minmax(0,1fr)]">
      {sidebar}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
