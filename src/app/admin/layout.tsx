import { ReactNode } from "react";
import { AdminSidebar } from "./_components/AdminSidebar";
import { MobileNav } from "@/components/ui/mobile-nav";
import { DashboardFooter } from "../dashboard/_components/dashboard-footer";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--bg-subtle)] text-[var(--text-strong)]">
      <AdminSidebar />
      <main className="relative flex flex-1 flex-col overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,193,255,0.14),transparent_24%),radial-gradient(circle_at_20%_20%,rgba(2,132,199,0.08),transparent_22%),linear-gradient(180deg,rgba(248,251,255,0.96)_0%,rgba(245,247,250,1)_100%)]" />
        <div className="relative flex-1">{children}</div>
        <div className="relative">
          <DashboardFooter />
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
