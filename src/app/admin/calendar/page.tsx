import { PageTransition } from "@/app/dashboard/_components/motion-wrappers";
import { CalendarWorkspaceClient } from "@/components/calendar/calendar-workspace-client";
import { requirePageAuth } from "@/lib/page-auth";

export default async function AdminCalendarPage() {
  const auth = await requirePageAuth(["ADMIN", "SUPER_ADMIN"]);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] px-6 py-12 lg:px-10">
        <CalendarWorkspaceClient
          description={
            auth.role === "SUPER_ADMIN"
              ? "Audit platform-wide class delivery, deadlines, and assessment timing from one synchronized owner-level calendar."
              : "Keep live classes, assignments, and exams aligned across the platform with one operational schedule view."
          }
          endpoint="/api/admin/calendar"
          eyebrow={auth.role === "SUPER_ADMIN" ? "Owner Control Layer" : "Operations Layer"}
          title={auth.role === "SUPER_ADMIN" ? "Command Calendar" : "Operations Calendar"}
          variant="admin"
        />
      </div>
    </PageTransition>
  );
}
