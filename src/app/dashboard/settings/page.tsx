import { Metadata } from "next";
import { SettingsForm } from "../_components/settings-form";

export const metadata: Metadata = {
  title: "Settings | Dashboard",
  description: "Manage your account settings",
};

export default function SettingsPage() {
  return (
    <div className="text-black bg-[#f7f5f4] min-h-screen">
      {/* Sidebar matches all other student panel pages */}
      <div className="mx-auto grid max-w-[1920px] lg:gap-0">
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 xl:py-12">
          <SettingsForm />
        </main>
      </div>
    </div>
  );
}
