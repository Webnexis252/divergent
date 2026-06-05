import { Metadata } from "next";
import { TeacherSidebar } from "../../_components/teacher-sidebar";
import { SettingsForm } from "../../_components/settings-form";

export const metadata: Metadata = {
  title: "Teacher Settings | Dashboard",
  description: "Manage your teacher account settings",
};

export default function TeacherSettingsPage() {
  return (
    <div className="mx-auto grid max-w-[1920px] gap-6 px-0 pb-14 pt-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
      <TeacherSidebar />
      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-[38px] lg:py-[18px]">
        <SettingsForm />
      </main>
    </div>
  );
}

