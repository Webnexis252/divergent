import { requirePageAuth } from "@/lib/page-auth";
import Link from "next/link";
import { formatShortDate } from "@/lib/date-format";
import prisma from "@/lib/prisma";
import { DeleteExamButton } from "./_components/delete-exam-button";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { BookOpen, CalendarDays, ChevronDown, FileText, Plus } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  IconChip,
  StatusBadge,
  adminButton,
  adminPanelClass,
  adminToolbarClass,
} from "../_components/admin-ui";

const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

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

  // Course → month → exams. Exams arrive newest first, so months within a
  // course come out newest first too. Months use the same (server) time zone
  // as formatShortDate, so each card sits under the month its date shows.
  const courseGroups = new Map<
    string,
    { id: string; title: string; attempts: number; months: Map<string, { label: string; exams: typeof exams }> }
  >();
  for (const exam of exams) {
    let course = courseGroups.get(exam.courseId);
    if (!course) {
      course = { id: exam.courseId, title: exam.course.title, attempts: 0, months: new Map() };
      courseGroups.set(exam.courseId, course);
    }
    course.attempts += exam._count.attempts;

    const created = new Date(exam.createdAt);
    const monthKey = `${created.getFullYear()}-${created.getMonth()}`;
    let month = course.months.get(monthKey);
    if (!month) {
      month = { label: monthLabel.format(created), exams: [] };
      course.months.set(monthKey, month);
    }
    month.exams.push(exam);
  }
  const courses = [...courseGroups.values()].sort((a, b) => a.title.localeCompare(b.title));
  const examCount = (course: (typeof courses)[number]) =>
    [...course.months.values()].reduce((sum, m) => sum + m.exams.length, 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Exam management"
            icon={FileText}
            title="Interactive exams"
            description={`${exams.length} exam${exams.length === 1 ? "" : "s"} across ${courses.length} course${courses.length === 1 ? "" : "s"}, grouped by course and month.`}
            actions={
              <Link href="/admin/exams/create" className={adminButton.primary}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create test
              </Link>
            }
          />
        </RevealSection>

        {exams.length === 0 ? (
          <RevealSection delay={0.05}>
            <AdminPanel>
              <AdminEmptyState
                icon={FileText}
                title="No exams yet"
                description="Click Create test to parse a PDF and create your first exam."
              />
            </AdminPanel>
          </RevealSection>
        ) : (
          <>
            {courses.length > 1 && (
              <RevealSection delay={0.04}>
                <nav aria-label="Jump to course" className={`${adminToolbarClass} flex flex-wrap items-center gap-2`}>
                  <span className="mr-1 text-[12px] font-semibold text-[#475569]">Jump to</span>
                  {courses.map((course) => (
                    <a
                      key={course.id}
                      href={`#course-${course.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-white py-1 pl-3 pr-1.5 text-[12px] font-semibold text-[#334155] transition-colors hover:border-[#bae6fd] hover:bg-[#f0f9ff] hover:text-[#0369a1]"
                    >
                      {course.title}
                      <span className="rounded-full bg-[#f1f5f9] px-1.5 py-0.5 text-[11px] tabular-nums text-[#64748b]">
                        {examCount(course)}
                      </span>
                    </a>
                  ))}
                </nav>
              </RevealSection>
            )}

            <RevealSection delay={0.06}>
              <div className="space-y-6">
                {courses.map((course) => {
                  const count = examCount(course);
                  return (
                    <details key={course.id} id={`course-${course.id}`} open className={`group scroll-mt-6 ${adminPanelClass}`}>
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[24px] p-5 transition-colors hover:bg-[#fbfcfd] sm:p-6 [&::-webkit-details-marker]:hidden">
                        <IconChip icon={BookOpen} tone="sky" />
                        <div className="min-w-0 flex-1">
                          <h2 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">{course.title}</h2>
                          <p className="mt-0.5 text-[13px] text-[#64748b]">
                            {count} exam{count === 1 ? "" : "s"} · {course.attempts} attempt{course.attempts === 1 ? "" : "s"} · {course.months.size} month{course.months.size === 1 ? "" : "s"}
                          </p>
                        </div>
                        <ChevronDown
                          className="h-5 w-5 shrink-0 text-[#94a3b8] transition-transform group-open:rotate-180"
                          aria-hidden="true"
                        />
                      </summary>

                      <div className="space-y-6 border-t border-[#eef1f5] px-5 pb-6 pt-5 sm:px-6">
                        {[...course.months.entries()].map(([monthKey, month]) => (
                          <section key={monthKey} aria-label={`${course.title}, ${month.label}`}>
                            <div className="mb-3 flex items-center gap-3">
                              <CalendarDays className="h-4 w-4 text-[#94a3b8]" aria-hidden="true" />
                              <h3 className="text-[13px] font-semibold text-[#334155]">{month.label}</h3>
                              <StatusBadge>{month.exams.length}</StatusBadge>
                              <span className="h-px flex-1 bg-[#eef1f5]" aria-hidden="true" />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {month.exams.map((exam) => (
                                <div
                                  key={exam.id}
                                  className="group/card relative flex flex-col justify-between rounded-[18px] border border-[#eef1f5] bg-white p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#e2e8f0] hover:shadow-[0_14px_30px_rgba(15,23,42,0.07)]"
                                >
                                  <Link
                                    href={`/admin/courses/${exam.courseId}/exams/${exam.id}`}
                                    className="absolute inset-0 z-0 rounded-[18px]"
                                    aria-label={`Open ${exam.title}`}
                                  />

                                  <div className="pointer-events-none relative z-10 mb-4">
                                    <h4 className="text-[16px] font-semibold leading-snug text-[#0f172a] transition-colors group-hover/card:text-[#0369a1]">
                                      {exam.title}
                                    </h4>
                                    <p className="mt-1.5 text-[13px] text-[#64748b]">
                                      {exam.durationMins} mins · {exam._count.questions} question{exam._count.questions === 1 ? "" : "s"}
                                    </p>
                                  </div>

                                  <div className="pointer-events-none relative z-10 mt-auto flex items-center justify-between border-t border-[#f1f5f9] pt-4 text-[12px] text-[#94a3b8]">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-semibold text-[#334155]">
                                        {exam._count.attempts} attempt{exam._count.attempts === 1 ? "" : "s"}
                                      </span>
                                      <span>Created {formatShortDate(exam.createdAt)}</span>
                                    </div>
                                    <div className="pointer-events-auto">
                                      <DeleteExamButton examId={exam.id} courseId={exam.courseId} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </RevealSection>
          </>
        )}
      </div>
    </PageTransition>
  );
}
