import { getPageAuth } from "@/lib/page-auth";
import { PageTransition } from "../_components/motion-wrappers";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import { Suspense } from "react";
import { DashboardContent } from "./_components/DashboardContent";
import { DashboardSkeleton } from "./_components/DashboardSkeleton";

export const dynamic = "force-dynamic";

export default async function DashboardCoursesPage() {
  const auth = await getPageAuth(["STUDENT"]);

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">
        <div className="mx-auto max-w-[1920px] px-4 py-6 sm:px-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <DashboardSidebar />

            <section className="min-w-0 px-0 sm:px-4 xl:pr-10">
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent userId={auth?.userId} />
              </Suspense>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
