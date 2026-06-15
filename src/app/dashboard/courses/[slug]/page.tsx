import { PageTransition } from "../../_components/motion-wrappers";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import { Suspense } from "react";
import { CourseDetailContent } from "./CourseDetailContent";
import { CourseDetailSkeleton } from "./CourseDetailSkeleton";

export const dynamic = "force-dynamic";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">
        <div className="mx-auto max-w-[1920px] px-3 pb-14 pt-4 sm:px-6 sm:pt-6 xl:px-0 xl:pb-24">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <DashboardSidebar />

            <section className="relative px-0 sm:px-4 xl:pr-10">
              <Suspense fallback={<CourseDetailSkeleton />}>
                <CourseDetailContent slug={slug} />
              </Suspense>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
