import { requirePageAuth } from "@/lib/page-auth";
import Link from "next/link";
import { formatShortDate } from "@/lib/date-format";
import prisma from "@/lib/prisma";

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
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-12">
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-[#2563eb] via-[#3b82f6] to-[#60a5fa] px-6 py-10 text-white shadow-[0_24px_48px_rgba(59,130,246,0.3)] sm:px-8 lg:px-12 lg:py-12">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="max-w-[720px]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75">
                Exam Management
              </p>
              <h1 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                AI-Powered Exams
              </h1>
              <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-white/88">
                Upload PDF question papers to automatically extract questions and generate interactive exam modules for your students.
              </p>
            </div>

            <Link
              href="/admin/exams/create"
              className="shrink-0 rounded-[16px] bg-white px-6 py-3 text-[14px] font-semibold text-[#2563eb] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition hover:scale-105 hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
            >
              Create test
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#e8eaef] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="border-b border-[#eef0f3] px-6 py-5">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">
              Generated Exams
            </h2>
          </div>

          <div className="p-5 space-y-3">
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
              exams.map((exam) => (
                <Link key={exam.id} href={`/admin/courses/${exam.courseId}/exams/${exam.id}`}>
                  <article
                    className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-6 py-5 transition hover:shadow-sm"
                  >
                    <div>
                      <h3 className="font-semibold text-[#101828]">{exam.title}</h3>
                      <p className="mt-1 text-[13px] text-[#667085]">
                        {exam.course.title} · {exam.durationMins} mins · {exam._count.questions} questions
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[13px] text-[#94a3b8]">
                      <span>{exam._count.attempts} attempts</span>
                      <span>Created {formatShortDate(exam.createdAt)}</span>
                    </div>
                  </article>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
