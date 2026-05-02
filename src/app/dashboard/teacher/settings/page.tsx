import { Metadata } from "next";
import { TeacherSidebar } from "../../_components/teacher-sidebar";
import { SettingsForm } from "../../_components/settings-form";

export const metadata: Metadata = {
  title: "Teacher Settings | Dashboard",
  description: "Manage your teacher account settings",
};

export default function TeacherSettingsPage() {
  return (
    <div className="flex gap-8 px-4 py-8 sm:px-6 lg:px-[40px] lg:py-12">
      <TeacherSidebar />
      <main className="flex-1 min-w-0">
        <SettingsForm />
      </main>
    </div>
  );
}
