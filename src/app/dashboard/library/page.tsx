import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { DashboardSidebar } from "../../dashboard/_components/sidebar-nav";
import { PageTransition, RevealSection, AnimCard } from "../../dashboard/_components/motion-wrappers";
import Link from "next/link";
import { Library, BookMarked } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: auth.userId, status: "ACTIVE" },
    include: {
      course: true,
    },
  });

  return (
    <div className="text-black bg-[#f7f5f4] min-h-screen">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-4 py-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0 lg:px-0">
          <DashboardSidebar />

          <section className="px-6 py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1160px] space-y-10">
              <RevealSection>
                <div className="space-y-2">
                  <h1 className="text-[28px] font-semibold text-black">Library</h1>
                  <p className="text-[15px] text-[#595959]">
                    Access all the book PDFs and supplementary materials uploaded by your admins for your enrolled courses.
                  </p>
                </div>
              </RevealSection>

              <div className="space-y-12">
                {enrollments.length === 0 ? (
                  <AnimCard>
                    <div className="rounded-[20px] bg-white p-8 text-center shadow-sm">
                      <p className="text-[16px] text-black">You are not enrolled in any courses yet.</p>
                      <Link href="/dashboard/courses" className="mt-4 inline-block rounded-lg bg-[#38c1ff] px-6 py-2 font-medium text-white">Browse Courses</Link>
                    </div>
                  </AnimCard>
                ) : (
                  enrollments.map((enrollment) => (
                    <RevealSection key={enrollment.courseId} className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
                        <Library className="h-6 w-6 text-[#ffc107]" />
                        <h2 className="text-[22px] font-semibold text-black">{enrollment.course.title}</h2>
                      </div>

                      <div className="rounded-[20px] bg-white p-12 text-center shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col items-center">
                        <BookMarked className="h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-[18px] font-medium text-black mb-2">No books uploaded yet</h3>
                        <p className="text-[14px] text-gray-500 max-w-md">
                          Admins have not uploaded any supplementary library books or PDFs for this course yet. Check back later!
                        </p>
                      </div>
                    </RevealSection>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
