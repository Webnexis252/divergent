"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Students", href: "/dashboard/teacher/analytics" },
  { label: "Questions", href: "/dashboard/teacher/analytics/questions" },
];

/** Switches between the two analytics pages. Sits on the hero's gradient. */
export function AnalyticsTabs() {
  const pathname = usePathname();
  return (
    <nav className="inline-flex rounded-full bg-white/15 p-1" aria-label="Analytics views">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition ${
              active ? "bg-white text-[#7c3aed]" : "text-white/85 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
