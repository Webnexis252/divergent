import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { DashboardSidebar } from "../../dashboard/_components/sidebar-nav";
import { PageTransition, RevealSection, AnimCard } from "../../dashboard/_components/motion-wrappers";
import Link from "next/link";
import { FileQuestion, Clock, CheckCircle, ChevronRight, BookOpen, AlertCircle, PlayCircle, BarChart2 } from "lucide-react";

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
    <div className="text-black bg-[#f9fafb] min-h-screen pb-24 sm:bg-[#f7f5f4] sm:pb-0">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 py-4 sm:px-6 sm:py-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0 lg:px-0 xl:py-8">
          <DashboardSidebar />

          <section className="min-w-0 space-y-6 px-4 py-5 sm:px-6 sm:py-6 sm:space-y-8 lg:px-[38px] lg:py-[18px] xl:pr-10">
            {/* Header / Hero */}
            <RevealSection>
              <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#925fe2_0%,#6b21a8_100%)] px-6 py-8 text-white shadow-[0_12px_32px_rgba(146,95,226,0.3)] sm:px-10 sm:py-10">
                <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                
                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-md border border-white/20">
                    <FileQuestion className="h-4 w-4" />
                    <span className="text-[12px] font-bold uppercase tracking-wider">Assessments</span>
                  </div>
                  <h1 className="text-[2.2rem] font-bold leading-tight tracking-[-0.02em] sm:text-[clamp(2rem,4vw,3rem)]">
                    Your Tests & Exams
                  </h1>
                  <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/90 sm:text-[1.1rem]">
                    Evaluate your knowledge, track your progress, and prepare for success. Here are all the assessments tailored for your enrolled courses.
                  </p>
                </div>
              </div>
            </RevealSection>

            {/* Content */}
            <div className="space-y-10">
              {enrollments.length === 0 ? (
                <RevealSection delay={0.1}>
                  <div className="flex flex-col items-center justify-center rounded-[24px] bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#f3e8ff]">
                      <BookOpen className="h-10 w-10 text-[#925fe2]" />
                    </div>
                    <h3 className="text-[22px] font-bold text-gray-900">No Courses Yet</h3>
                    <p className="mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
                      Enroll in a course to access its tests and assessments. Your learning journey starts here.
                    </p>
                    <Link
                      href="/dashboard/courses"
                      className="mt-8 inline-flex items-center gap-2 rounded-[12px] bg-[#38c1ff] px-8 py-3.5 font-bold text-white shadow-[0_4px_14px_rgba(56,193,255,0.4)] transition hover:-translate-y-1 hover:bg-[#0ea5e9]"
                    >
                      Browse Courses <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </RevealSection>
              ) : (
                enrollments.map((enrollment, idx) => (
                  <RevealSection key={enrollment.courseId} delay={0.1 + (idx * 0.05)} className="space-y-6">
                    {/* Course Header */}
                    <div className="flex items-center gap-4 border-b border-gray-200/80 pb-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm border border-indigo-100/50">
                        <FileQuestion className="h-6 w-6 text-indigo-500" />
                      </div>
                      <div>
                        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">{enrollment.course.title}</h2>
                        <p className="text-[13px] font-medium text-gray-500 mt-0.5">
                          {enrollment.course.tests.length} {enrollment.course.tests.length === 1 ? "Assessment" : "Assessments"} Available
                        </p>
                      </div>
                    </div>

                    {enrollment.course.tests.length === 0 ? (
                      <div className="rounded-[20px] bg-white/60 px-6 py-8 text-center border border-dashed border-gray-300">
                        <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                        <p className="text-[15px] font-medium text-gray-600">No tests published yet.</p>
                        <p className="text-[13px] text-gray-500 mt-1">Check back later for new assessments.</p>
                      </div>
                    ) : (
                      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {enrollment.course.tests.map((test) => {
                          const hasAttempted = test.attempts && test.attempts.length > 0;
                          
                          return (
                            <AnimCard key={test.id} className="h-full">
                              <div className="group relative flex h-full flex-col rounded-[22px] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:border-[#38c1ff]/30">
                                {/* Status Badge */}
                                <div className="mb-4 flex items-center justify-between">
                                  {hasAttempted ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      ATTEMPTED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-600 ring-1 ring-inset ring-amber-600/20">
                                      <Clock className="h-3.5 w-3.5" />
                                      PENDING
                                    </span>
                                  )}
                                  
                                  <div className="flex items-center gap-3 text-[12px] font-semibold text-gray-400">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="h-4 w-4 text-gray-300" />
                                      {test.durationMins}m
                                    </span>
                                  </div>
                                </div>

                                {/* Content */}
                                <div className="mb-6 flex-1">
                                  <h3 className="text-[18px] font-bold leading-snug text-gray-900 group-hover:text-[#38c1ff] transition-colors line-clamp-2 mb-2">
                                    {test.title}
                                  </h3>
                                  <p className="text-[14px] leading-relaxed text-gray-500 line-clamp-2">
                                    {test.description || "Test your knowledge on this topic."}
                                  </p>
                                </div>
                                
                                {/* Footer */}
                                <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg">
                                    <FileQuestion className="h-3.5 w-3.5 text-gray-400" />
                                    {test._count.questions} Qs
                                  </div>
                                  
                                  <Link
                                    href={hasAttempted ? `/dashboard/courses/${enrollment.course.slug}/tests/${test.id}/results` : `/dashboard/courses/${enrollment.course.slug}/tests/${test.id}`}
                                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[13px] font-bold transition-all ${
                                      hasAttempted 
                                        ? "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:text-gray-900 shadow-sm"
                                        : "bg-gradient-to-r from-[#38c1ff] to-[#0ea5e9] text-white hover:shadow-[0_4px_12px_rgba(56,193,255,0.4)]"
                                    }`}
                                  >
                                    {hasAttempted ? (
                                      <>
                                        View Results <BarChart2 className="h-4 w-4" />
                                      </>
                                    ) : (
                                      <>
                                        Start Test <PlayCircle className="h-4 w-4" />
                                      </>
                                    )}
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
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
