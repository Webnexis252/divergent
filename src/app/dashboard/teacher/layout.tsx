import { TeacherTopBar } from "@/app/dashboard/_components/teacher-top-bar";
import { TeacherFrame } from "@/app/dashboard/_components/teacher-sidebar";

/**
 * Shared layout for all /dashboard/teacher/* pages: TeacherTopBar across the
 * top, then the shared sidebar beside the page. Pages render only their own
 * content, so the sidebar looks and sits the same on every teacher page.
 */
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <TeacherTopBar />
      <TeacherFrame>{children}</TeacherFrame>
    </div>
  );
}
