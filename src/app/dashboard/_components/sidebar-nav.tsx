"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  const navItems = studentNavItems;

  return (
    <div className="hidden lg:block lg:pr-7 py-6">
      <aside className="sticky top-3 z-20 -mx-1 overflow-hidden rounded-[28px] border border-[#ffe08a] bg-[linear-gradient(180deg,#ffcb2f_0%,#ffe58f_100%)] px-3 py-3 shadow-[0_16px_36px_rgba(254,198,0,0.22)] lg:static lg:mx-0 lg:rounded-l-[0] lg:rounded-r-[40px] lg:border-none lg:bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] lg:px-7 lg:py-12 lg:shadow-[0_18px_48px_rgba(254,198,0,0.18)] lg:min-h-[calc(100vh-48px)]">
        <nav className="scrollbar-none flex snap-x gap-2 overflow-x-auto pb-0.5 lg:flex-col lg:gap-1 lg:overflow-visible">
          {navItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                className={cx(
                  "flex min-w-max snap-start items-center gap-2.5 rounded-[20px] bg-white/28 px-3 py-2.5 text-[13px] font-semibold text-black transition-colors duration-150 lg:min-h-[56px] lg:gap-4 lg:rounded-[22px] lg:bg-transparent lg:px-5 lg:py-3 lg:text-[18px] lg:font-medium",
                  active
                    ? "bg-white/78 shadow-[0_10px_22px_rgba(0,0,0,0.08)] lg:bg-white/40 lg:shadow-sm"
                    : "hover:bg-white/46 lg:hover:bg-white/20",
                )}
                href={item.href}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
