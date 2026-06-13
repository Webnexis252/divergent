import { requirePageAuth } from "@/lib/page-auth";
import Link from "next/link";
import { formatShortDate } from "@/lib/date-format";
import prisma from "@/lib/prisma";
import { DeleteExamButton } from "./_components/delete-exam-button";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { cx } from "@/lib/cx";
import { buttonStyles } from "@/components/ui/button";

export default async function AdminExamsPage() {
  const auth = await requirePageAuth(["ADMIN", "SUPER_ADMIN"]);
  if (!auth) return null;

  const exams = await prisma.courseTest.findMany({
    where: { type: "COURSE_EXAM" },
    include: {
      course: { select: { title: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#38c1ff] px-8 py-10 text-white shadow-[0_24px_60px_rgba(2,132,199,0.28)]">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Exam Management
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Interactive Exams</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                  Create and manage interactive exam modules for your students to test their knowledge and track their progress.
                </p>
              </div>
              <Link
                href="/admin/exams/create"
                className={cx(
                  buttonStyles({
                    variant: "secondary",
                    size: "md",
                    className:
                      "shrink-0 rounded-[18px] border-white/70 bg-white/94 text-[#0284c7] hover:bg-white",
                  }),
                )}
              >
                + Create test
              </Link>
            </div>
          </section>
        </RevealSection>

        <RevealSection delay={0.05}>
          <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">
                Generated Exams
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {exams.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-16 text-center">
                  <p className="text-[40px]">📝</p>
                  <p className="mt-3 text-[16px] font-semibold text-[#374151]">
                    No exams yet
                  </p>
                  <p className="mt-2 text-[13px] text-[#667085]">
                    Click &ldquo;Create test&rdquo; to parse a PDF and create your first exam.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {exams.map((exam) => (
                    <div key={exam.id} className="group relative flex flex-col justify-between rounded-[20px] border border-[#eceef2] bg-[#fcfcfd] p-5 transition hover:shadow-md hover:-translate-y-1">
                      <Link href={`/admin/courses/${exam.courseId}/exams/${exam.id}`} className="absolute inset-0 z-0" />
                      
                      <div className="relative z-10 pointer-events-none mb-4">
                        <div className="mb-3 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {exam.course.title}
                        </div>
                        <h3 className="font-semibold text-lg leading-tight text-[#101828] group-hover:text-blue-600 transition-colors">{exam.title}</h3>
                        <p className="mt-2 text-[13px] text-[#667085]">
                          {exam.durationMins} mins · {exam._count.questions} questions
                        </p>
                      </div>
                      
                      <div className="relative z-10 mt-auto flex items-center justify-between border-t border-[#f1f5f9] pt-4 text-[12px] text-[#94a3b8] pointer-events-none">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-[#64748b]">{exam._count.attempts} attempts</span>
                          <span>Created {formatShortDate(exam.createdAt)}</span>
                        </div>
                        <div className="pointer-events-auto">
                          <DeleteExamButton examId={exam.id} courseId={exam.courseId} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
