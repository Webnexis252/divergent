import { PageTransition } from "@/app/dashboard/_components/motion-wrappers";
import { TeacherSidebar } from "@/app/dashboard/_components/teacher-sidebar";
import { TeacherTopBar } from "@/app/dashboard/_components/teacher-top-bar";
import { CalendarWorkspaceClient } from "@/components/calendar/calendar-workspace-client";
import { requirePageAuth } from "@/lib/page-auth";

export default async function TeacherCalendarPage() {
  await requirePageAuth(["MENTOR"]);

  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <PageTransition>
        <TeacherTopBar />
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <TeacherSidebar />

          <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <CalendarWorkspaceClient
              description="See upcoming live classes, assignment deadlines, and exam activity for the courses you teach in one shared scheduling surface."
              endpoint="/api/teacher/calendar"
              eyebrow="Teaching Workspace"
              title="Teaching Calendar"
              variant="teacher"
            />
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
