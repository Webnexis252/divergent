import { Metadata } from "next";
import { DashboardSidebar } from "../_components/sidebar-nav";
import { SettingsForm } from "../_components/settings-form";

export const metadata: Metadata = {
  title: "Settings | Dashboard",
  description: "Manage your account settings",
};

export default function SettingsPage() {
  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar matches profile/courses pages */}
      <DashboardSidebar />
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 xl:py-12">
        <SettingsForm />
      </main>
    </div>
  );
}
