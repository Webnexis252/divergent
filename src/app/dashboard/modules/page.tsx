import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { DashboardSidebar } from "../../dashboard/_components/sidebar-nav";
import { PageTransition, RevealSection, AnimCard } from "../../dashboard/_components/motion-wrappers";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronRight, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

function formatResourceDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default async function ModulesPage() {
  const auth = await getPageAuth(["STUDENT"]);
  if (!auth) redirect("/login");

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: auth.userId, status: "ACTIVE" },
    include: {
      course: {
        include: {
          teacherResources: {
            orderBy: { createdAt: "desc" }
          },
          chapters: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            include: {
              lessons: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="text-black bg-[#f9fafb] min-h-screen pb-24 sm:bg-[#f7f5f4] sm:pb-0">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <DashboardSidebar />

          <section className="min-w-0 px-0 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1160px] space-y-6 sm:space-y-10">
              <RevealSection>
                <div className="space-y-1.5 sm:space-y-2">
                  <h1 className="text-[24px] font-bold tracking-tight text-black sm:text-[28px] sm:font-semibold">Your Modules</h1>
                  <p className="text-[14px] leading-relaxed text-[#595959] sm:text-[15px]">
                    Access PDFs, lessons, and modules specific to the courses you are enrolled in.
                  </p>
                </div>
              </RevealSection>

              <div className="space-y-8 sm:space-y-12">
                {enrollments.length === 0 ? (
                  <AnimCard>
                    <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_4px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/5">
                      <p className="text-[15px] text-black">You are not enrolled in any courses yet.</p>
                      <Link href="/dashboard/courses" className="mt-5 inline-block rounded-xl bg-[#38c1ff] px-6 py-2.5 text-[14px] font-semibold text-white shadow-sm transition hover:bg-[#32b0e8] active:scale-[0.98]">Browse Courses</Link>
                    </div>
                  </AnimCard>
                ) : (
                  enrollments.map((enrollment) => {
                    const totalLessons = enrollment.course.chapters.reduce(
                      (sum, chapter) => sum + chapter.lessons.length,
                      0
                    );
                    const totalMaterials = enrollment.course.teacherResources.length;

                    return (
                      <RevealSection key={enrollment.courseId} className="space-y-5 sm:space-y-6">
                        <div className="overflow-hidden rounded-[28px] border border-[#e8ddd1]/60 bg-white p-2.5 shadow-[0_8px_30px_rgba(88,61,24,0.04)] sm:rounded-[30px] sm:bg-white/80 sm:p-6 sm:shadow-[0_24px_60px_rgba(88,61,24,0.08)] sm:backdrop-blur-sm">
                          <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(255,246,225,0.95)_0%,rgba(237,248,255,0.95)_58%,rgba(239,255,248,0.96)_100%)] p-4 ring-1 ring-[#f1e8dc] sm:p-6">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                              <div className="space-y-3">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8f6b2d] shadow-sm sm:gap-2 sm:text-[11px] sm:tracking-[0.24em]">
                                  <BookOpen className="h-3 w-3 text-[#38c1ff] sm:h-3.5 sm:w-3.5" />
                                  Course Library
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                  <h2 className="text-[20px] font-bold tracking-tight text-[#111827] sm:text-[24px] sm:font-semibold">
                                    {enrollment.course.title}
                                  </h2>
                                  <p className="max-w-2xl text-[13px] leading-relaxed text-[#5f6472] sm:text-[14px]">
                                    Lessons and teacher-uploaded materials collected in one clean study space.
                                  </p>
                                </div>
                              </div>

                              <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 sm:pb-0">
                                <div className="min-w-[120px] shrink-0 snap-start rounded-[20px] bg-white/85 px-4 py-3.5 shadow-sm ring-1 ring-[#eee5d9] sm:min-w-0 sm:rounded-[18px]">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7940] sm:text-[11px] sm:tracking-[0.22em]">
                                    Modules
                                  </p>
                                  <p className="mt-1.5 text-[20px] font-bold text-[#111827] sm:mt-2 sm:text-[24px]">
                                    {enrollment.course.chapters.length}
                                  </p>
                                </div>
                                <div className="min-w-[120px] shrink-0 snap-start rounded-[20px] bg-white/85 px-4 py-3.5 shadow-sm ring-1 ring-[#dfeef8] sm:min-w-0 sm:rounded-[18px]">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4b84a8] sm:text-[11px] sm:tracking-[0.22em]">
                                    Lessons
                                  </p>
                                  <p className="mt-1.5 text-[20px] font-bold text-[#111827] sm:mt-2 sm:text-[24px]">
                                    {totalLessons}
                                  </p>
                                </div>
                                <div className="min-w-[120px] shrink-0 snap-start rounded-[20px] bg-white/85 px-4 py-3.5 shadow-sm ring-1 ring-[#d7ebdf] sm:min-w-0 sm:rounded-[18px]">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2e7c58] sm:text-[11px] sm:tracking-[0.22em]">
                                    Materials
                                  </p>
                                  <p className="mt-1.5 text-[20px] font-bold text-[#111827] sm:mt-2 sm:text-[24px]">
                                    {totalMaterials}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {enrollment.course.chapters.length > 0 ? (
                            <div className="mt-6 space-y-4">
                              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                                <div>
                                  <h3 className="text-[16px] font-bold text-[#111827] sm:text-[15px] sm:font-semibold">Chapter Modules</h3>
                                  <p className="text-[13px] leading-relaxed text-[#6b7280]">
                                    Open lessons directly from each module card.
                                  </p>
                                </div>
                                <div className="inline-flex w-fit items-center rounded-full bg-[#eef8ff] px-3 py-1.5 text-[11px] font-medium text-[#447896] sm:px-3 sm:py-1 sm:text-[12px]">
                                  {totalLessons} lesson{totalLessons === 1 ? "" : "s"} available
                                </div>
                              </div>

                              <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
                                {enrollment.course.chapters.map((chapter, chapterIndex) => (
                                  <AnimCard key={chapter.id}>
                                    <div className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#d8ebf8] bg-[linear-gradient(180deg,#ffffff_0%,#f7fcff_100%)] p-4 sm:p-5 shadow-[0_8px_30px_rgba(56,120,170,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(56,120,170,0.1)] sm:rounded-[26px]">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                          <span className="inline-flex rounded-full bg-[#e7f7ff] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#397da2] sm:px-3 sm:text-[11px]">
                                            Module {String(chapterIndex + 1).padStart(2, "0")}
                                          </span>
                                          <h4 className="text-[16px] font-bold tracking-tight text-[#111827] sm:text-[18px]">
                                            {chapter.title}
                                          </h4>
                                        </div>

                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#38c1ff] shadow-[inset_0_0_0_1px_rgba(56,193,255,0.18)] sm:h-12 sm:w-12 sm:rounded-[18px]">
                                          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                                        </div>
                                      </div>

                                      <div className="mt-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-[#587387] shadow-sm ring-1 ring-[#dfeef7]">
                                        {chapter.lessons.length} lesson{chapter.lessons.length === 1 ? "" : "s"}
                                      </div>

                                      <div className="mt-4 flex-1 space-y-3">
                                        {chapter.lessons.length === 0 ? (
                                          <div className="rounded-[18px] border border-dashed border-[#cfe2ef] bg-white/80 px-4 py-5 text-[13px] text-[#7a8692]">
                                            Lessons will appear here once this module is ready.
                                          </div>
                                        ) : (
                                          <>
                                            {chapter.lessons.slice(0, 4).map((lesson, lessonIndex) => (
                                              <Link
                                                key={lesson.id}
                                                href={`/dashboard/courses/${enrollment.course.slug}/lessons/${lesson.id}`}
                                                className="group/lesson flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 shadow-[inset_0_0_0_1px_rgba(218,233,244,0.95)] transition hover:bg-[#f2fbff] hover:shadow-[inset_0_0_0_1px_rgba(56,193,255,0.28)]"
                                              >
                                                <div className="min-w-0 flex items-center gap-3">
                                                  <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#eef8ff] text-[#2b8cb8]">
                                                    <FileText className="h-4 w-4" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <p className="truncate text-[14px] font-medium text-[#172033]">
                                                      {lesson.title}
                                                    </p>
                                                    <p className="mt-0.5 text-[12px] text-[#7c8a9a]">
                                                      Lesson {lessonIndex + 1}
                                                    </p>
                                                  </div>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-[#8abbd7] transition group-hover/lesson:translate-x-0.5 group-hover/lesson:text-[#38c1ff]" />
                                              </Link>
                                            ))}

                                            {chapter.lessons.length > 4 ? (
                                              <div className="rounded-[16px] bg-[#eef8ff] px-4 py-3 text-[13px] font-medium text-[#39708c]">
                                                +{chapter.lessons.length - 4} more lessons inside this module
                                              </div>
                                            ) : null}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </AnimCard>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {enrollment.course.teacherResources.length > 0 ? (
                            <div className="mt-6 space-y-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                  <h3 className="text-[15px] font-semibold text-[#111827]">Teacher Materials</h3>
                                  <p className="text-[13px] text-[#6b7280]">
                                    Question banks, handouts, and PDFs shared for revision.
                                  </p>
                                </div>
                                <div className="inline-flex items-center rounded-full bg-[#edf9f3] px-3 py-1 text-[12px] font-medium text-[#2e7c58]">
                                  {totalMaterials} file{totalMaterials === 1 ? "" : "s"} ready
                                </div>
                              </div>

                              <div className="grid gap-4 sm:gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
                                {enrollment.course.teacherResources.map((resource) => (
                                  <AnimCard key={resource.id}>
                                    <div className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#cfe7d9] bg-[radial-gradient(circle_at_top_left,rgba(5,150,105,0.14),transparent_34%),linear-gradient(180deg,#ffffff_0%,#eefaf4_100%)] p-4 sm:p-5 shadow-[0_8px_30px_rgba(5,111,75,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(5,111,75,0.1)] sm:rounded-[26px]">
                                      <div className="flex items-start justify-between gap-3 sm:gap-4">
                                        <div className="flex items-start gap-3">
                                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[#059669] shadow-[inset_0_0_0_1px_rgba(5,150,105,0.15)] sm:h-12 sm:w-12 sm:rounded-[18px]">
                                            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                                          </div>
                                          <div className="space-y-1.5 sm:space-y-2">
                                            <span className="inline-flex rounded-full bg-[#ddf7e9] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#247550] sm:px-3 sm:text-[11px]">
                                              Teacher Material
                                            </span>
                                            <h4 className="text-[16px] font-bold tracking-tight text-[#111827] sm:text-[18px]">
                                              {resource.title}
                                            </h4>
                                          </div>
                                        </div>

                                        <span className="shrink-0 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#67806f] sm:px-3 sm:text-[11px]">
                                          {resource.type}
                                        </span>
                                      </div>

                                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-[18px] bg-white/90 px-4 py-3 shadow-sm ring-1 ring-[#deece5]">
                                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b9d89]">
                                            Shared
                                          </p>
                                          <p className="mt-1 text-[14px] font-medium text-[#163f2d]">
                                            {formatResourceDate(resource.createdAt)}
                                          </p>
                                        </div>
                                        <div className="rounded-[18px] bg-white/90 px-4 py-3 shadow-sm ring-1 ring-[#deece5]">
                                          <p className="text-[11px] uppercase tracking-[0.2em] text-[#7b9d89]">
                                            Use
                                          </p>
                                          <p className="mt-1 text-[14px] font-medium text-[#163f2d]">
                                            Revision and practice
                                          </p>
                                        </div>
                                      </div>

                                      <p className="mt-4 text-[13px] text-[#5b7367]">
                                        Keep this material handy while studying or revisit it before your next test.
                                      </p>

                                      <div className="mt-5">
                                        <a
                                          href={resource.fileUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="group/link flex items-center justify-between rounded-[18px] bg-[#059669] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(5,150,105,0.24)] transition hover:bg-[#047857]"
                                        >
                                          <span className="flex items-center gap-2">
                                            <FileText className="h-4 w-4" />
                                            Open Material
                                          </span>
                                          <ArrowRight className="h-4 w-4 transition group-hover/link:translate-x-0.5" />
                                        </a>
                                      </div>
                                    </div>
                                  </AnimCard>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {enrollment.course.chapters.length === 0 && enrollment.course.teacherResources.length === 0 ? (
                            <div className="mt-6 rounded-[22px] border border-dashed border-[#dbcdbd] bg-[#fffaf4] px-5 py-6 text-[14px] text-[#7d6d5d]">
                              No modules or materials are available for this course yet.
                            </div>
                          ) : null}
                        </div>
                      </RevealSection>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
