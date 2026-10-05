import { Metadata } from "next";
import { SettingsForm } from "../../_components/settings-form";

export const metadata: Metadata = {
  title: "Teacher Settings | Dashboard",
  description: "Manage your teacher account settings",
};

export default function TeacherSettingsPage() {
  return (
    <div className="mx-auto grid max-w-[1920px] gap-6 px-0 pb-14 pt-0 lg:gap-0">
      <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-[38px] lg:py-[18px]">
        <SettingsForm />
      </main>
    </div>
  );
}

