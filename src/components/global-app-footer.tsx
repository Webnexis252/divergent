"use client";

import { usePathname } from "next/navigation";
import { DashboardFooter } from "@/app/dashboard/_components/dashboard-footer";

export function GlobalAppFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    return null;
  }

  return <DashboardFooter />;
}
