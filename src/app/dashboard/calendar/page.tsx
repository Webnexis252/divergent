import { PageTransition } from "@/app/dashboard/_components/motion-wrappers";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import { CalendarWorkspaceClient } from "@/components/calendar/calendar-workspace-client";
import { requirePageAuth } from "@/lib/page-auth";

export default async function StudentCalendarPage() {
  await requirePageAuth(["STUDENT"]);

  return (
    <div className="text-black">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <DashboardSidebar />

          <section className="px-6 py-6 lg:px-[38px] lg:py-[18px]">
            <CalendarWorkspaceClient
              description="Track live classes, assignment deadlines, and published exams across the courses you are enrolled in from one coordinated schedule."
              endpoint="/api/student/calendar"
              eyebrow="Student Workspace"
              title="Your Calendar"
              variant="student"
            />
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
