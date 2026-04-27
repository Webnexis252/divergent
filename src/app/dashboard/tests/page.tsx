import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { DashboardSidebar } from "../../dashboard/_components/sidebar-nav";
import { PageTransition, RevealSection, AnimCard } from "../../dashboard/_components/motion-wrappers";
import Link from "next/link";
import { FileQuestion, Clock, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TestsPage() {
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: auth.userId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          tests: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { questions: true } },
              attempts: {
                where: { userId: auth.userId }
              }
            }
          },
        },
      },
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
                  <h1 className="text-[28px] font-semibold text-black">Your Tests & Assessments</h1>
                  <p className="text-[15px] text-[#595959]">
                    Attempt tests tailored for the courses you are enrolled in.
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
                        <FileQuestion className="h-6 w-6 text-[#925fe2]" />
                        <h2 className="text-[22px] font-semibold text-black">{enrollment.course.title}</h2>
                      </div>

                      {enrollment.course.tests.length === 0 ? (
                        <p className="text-[14px] text-gray-500">No tests available for this course.</p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {enrollment.course.tests.map((test) => {
                            const hasAttempted = test.attempts && test.attempts.length > 0;
                            
                            return (
                              <AnimCard key={test.id}>
                                <div className="flex flex-col h-full rounded-[16px] bg-white p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100 relative overflow-hidden">
                                  {hasAttempted && (
                                    <div className="absolute top-0 right-0 bg-[#4caf50] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                                      ATTEMPTED
                                    </div>
                                  )}
                                  <h3 className="text-[18px] font-semibold text-black mb-2 pr-8">{test.title}</h3>
                                  <p className="text-[13px] text-gray-500 line-clamp-2 mb-4">{test.description}</p>
                                  
                                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-[12px] font-medium text-gray-500">
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {test.durationMins}m</span>
                                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3"/> {test._count.questions} Qs</span>
                                    </div>
                                    
                                    <Link
                                      href={hasAttempted ? `/dashboard/courses/${enrollment.course.slug}/tests/${test.id}/results` : `/dashboard/courses/${enrollment.course.slug}/tests/${test.id}`}
                                      className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
                                        hasAttempted 
                                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                          : "bg-[#38c1ff] text-white hover:bg-[#1baee8]"
                                      }`}
                                    >
                                      {hasAttempted ? "View Results" : "Start Test"}
                                    </Link>
                                  </div>
                                </div>
                              </AnimCard>
                            );
                          })}
                        </div>
                      )}
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
