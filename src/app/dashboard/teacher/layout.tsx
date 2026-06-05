import { TeacherTopBar } from "@/app/dashboard/_components/teacher-top-bar";

/**
 * Shared layout for all /dashboard/teacher/* pages.
 * Renders TeacherTopBar once at the top so individual pages don't need to.
 * The sidebar is still rendered inside each page's own component (unchanged).
 */
export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <TeacherTopBar />
      {children}
    </div>
  );
}
