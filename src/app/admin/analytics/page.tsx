import { SharedAnalyticsDashboard } from "@/app/dashboard/_components/teacher-analytics";
import { requirePageAuth } from "@/lib/page-auth";

export default async function AdminAnalyticsPage() {
  await requirePageAuth(["ADMIN", "SUPER_ADMIN"]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1920px] px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:px-10 lg:pt-8">
        <SharedAnalyticsDashboard />
      </div>
    </div>
  );
}
