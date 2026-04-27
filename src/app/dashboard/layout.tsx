import { DashboardShell } from "./_components/dashboard-shell";
import { MobileNav } from "@/components/ui/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardShell>{children}</DashboardShell>
      <MobileNav />
    </>
  );
}
