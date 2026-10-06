import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronDown, FileText, PlayCircle, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { PageHero } from "@/components/ui/page-hero";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "../_components/motion-wrappers";
import {
  ArtCard,
  CourseHeading,
  CoursePill,
  GlanceRail,
  ListHeading,
  StatCard,
  brandInk,
  card,
  heroCard,
  pageColumns,
  pageMain,
  pageSection,
  pill,
  pillTone,
  primaryAction,
  secondaryAction,
} from "../_components/student-ui";

const art = {
  modules: "/assets/dashboard/explore-modules.png",
  lessons: "/assets/dashboard/quick-assignment.png",
  materials: "/assets/dashboard/course-stat.png",
} as const;

// Lessons shown on a module card before the rest fold into "Show more"
const VISIBLE_LESSONS = 4;

const lessonIcons: Record<"VIDEO" | "PDF" | "TEXT", LucideIcon> = {
  VIDEO: PlayCircle,
  PDF: FileText,
  TEXT: FileText,
};

const sharedDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

export type Lesson = { id: string; title: string; durationMins: number; contentType: "VIDEO" | "PDF" | "TEXT" };

export type ModuleCourse = {
  id: string;
  title: string;
  slug: string;
  teacherResources: Array<{ id: string; title: string; fileUrl: string; type: string; createdAt: Date }>;
  chapters: Array<{ id: string; title: string; lessons: Lesson[] }>;
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function LessonRow({ lesson, href, done }: { lesson: Lesson; href: string; done: boolean }) {
  const Icon = done ? CheckCircle2 : lessonIcons[lesson.contentType];
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[#f8fcff]">
        <span
          className={cx(
            "grid h-9 w-9 shrink-0 place-items-center rounded-[12px]",
            done ? "bg-[rgba(76,175,80,0.14)] text-[#2e6b31]" : cx("bg-(--brand-primary-soft)", brandInk),
          )}
        >
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx("block truncate text-[14px] font-medium", done ? "text-black/55" : "text-black")}>
            {lesson.title}
          </span>
          {lesson.durationMins > 0 && (
            <span className="mt-0.5 block text-[12px] tabular-nums text-black/45">{lesson.durationMins} min</span>
          )}
        </span>
        {done && <span className="sr-only">(completed)</span>}
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-black/25 transition group-hover:translate-x-0.5 group-hover:text-(--brand-primary-strong)"
        />
      </Link>
    </li>
  );
}

function ModuleCard({
  index,
  title,
  lessons,
  courseSlug,
  completed,
}: {
  index: number;
  title: string;
  lessons: Lesson[];
  courseSlug: string;
  completed: Set<string>;
}) {
  const doneCount = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const percent = lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0;
  const row = (lesson: Lesson) => (
    <LessonRow
      key={lesson.id}
      lesson={lesson}
      href={`/dashboard/courses/${courseSlug}/lessons/${lesson.id}`}
      done={completed.has(lesson.id)}
    />
  );

  return (
    <AnimCard className="h-full">
      <article className={cx(card, "flex h-full flex-col")}>
        <div className="px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <span className={cx(pill, pillTone.brand)}>Module {String(index + 1).padStart(2, "0")}</span>
            {lessons.length > 0 && (
              <span className="text-[12px] font-semibold tabular-nums text-black/50">
                {doneCount === lessons.length ? "Complete" : `${doneCount} of ${lessons.length} done`}
              </span>
            )}
          </div>
          <h4 className="mt-3 text-[17px] font-semibold leading-snug text-black">{title}</h4>
          {lessons.length > 0 && (
            <div
              role="progressbar"
              aria-label={`${title} progress`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]"
            >
              <div
                className={cx("h-full rounded-full", percent === 100 ? "bg-[#4caf50]" : "bg-(--brand-primary)")}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        {lessons.length === 0 ? (
          <p className="mx-5 mb-5 rounded-[14px] bg-black/[0.03] px-4 py-4 text-[13px] text-black/50">
            Lessons will appear here once this module is ready.
          </p>
        ) : (
          <div className="border-t border-black/[0.05]">
            <ol className="divide-y divide-black/[0.05]">{lessons.slice(0, VISIBLE_LESSONS).map(row)}</ol>
            {lessons.length > VISIBLE_LESSONS && (
              <details className="group/more border-t border-black/[0.05]">
                {/* Hidden once open: the rest of the lessons simply continue the list */}
                <summary
                  className={cx(
                    "flex cursor-pointer list-none items-center justify-center gap-1.5 px-5 py-3 text-[13px] font-semibold transition-colors hover:bg-[#f8fcff] group-open/more:hidden [&::-webkit-details-marker]:hidden",
                    brandInk,
                  )}
                >
                  Show {plural(lessons.length - VISIBLE_LESSONS, "more lesson")}
                  <ChevronDown aria-hidden="true" className="h-4 w-4" />
                </summary>
                <ol className="divide-y divide-black/[0.05]">
                  {lessons.slice(VISIBLE_LESSONS).map(row)}
                </ol>
              </details>
            )}
          </div>
        )}
      </article>
    </AnimCard>
  );
}

/** Every module, lesson and teacher material in the student's courses; `completed` holds finished lesson ids. */
export function ModulesView({ courses, completed }: { courses: ModuleCourse[]; completed: Set<string> }) {
  const lessonIds = courses.flatMap((course) => course.chapters.flatMap((chapter) => chapter.lessons.map((l) => l.id)));
  const moduleCount = courses.reduce((sum, course) => sum + course.chapters.length, 0);
  const materialCount = courses.reduce((sum, course) => sum + course.teacherResources.length, 0);
  const lessonCount = lessonIds.length;
  const doneCount = completed.size;

  // The first unfinished lesson in the course studied most recently
  let continueWith: { lesson: Lesson; moduleIndex: number; moduleTitle: string; course: (typeof courses)[number] } | null =
    null;
  for (const course of courses) {
    for (const [moduleIndex, chapter] of course.chapters.entries()) {
      const lesson = chapter.lessons.find((l) => !completed.has(l.id));
      if (lesson) {
        continueWith = { lesson, moduleIndex, moduleTitle: chapter.title, course };
        break;
      }
    }
    if (continueWith) break;
  }

  const heroSummary =
    courses.length === 0
      ? "Enroll in a course to unlock its modules and lessons."
      : lessonCount === 0
        ? "Modules from your courses will show up here."
        : `${plural(moduleCount, "module")} and ${plural(lessonCount, "lesson")} across ${plural(courses.length, "course")}. ${doneCount} done so far.`;

  return (
    <PageTransition>
      {/* overflow-x-clip, not hidden: hidden makes <main> a scroll container and breaks the sticky rail */}
      <main className={pageMain}>
        <section className={pageSection}>
          <RevealSection>
            <PageHero
              eyebrow="Modules"
              title="Your Modules"
              description={<p>{heroSummary}</p>}
              aside={
                continueWith ? (
                  <div className={heroCard}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={cx(pill, pillTone.brand)}>Continue learning</span>
                      {continueWith.lesson.durationMins > 0 && (
                        <span className="text-[12px] font-medium tabular-nums text-black/50">
                          {continueWith.lesson.durationMins} min
                        </span>
                      )}
                    </div>
                    <p className="mt-3 line-clamp-2 text-[17px] font-bold leading-snug">{continueWith.lesson.title}</p>
                    <p className="mt-1 truncate text-[13px] text-black/55">
                      Module {String(continueWith.moduleIndex + 1).padStart(2, "0")} · {continueWith.moduleTitle}
                    </p>
                    <div className="mt-2">
                      <CoursePill title={continueWith.course.title} />
                    </div>
                    <Link
                      href={`/dashboard/courses/${continueWith.course.slug}/lessons/${continueWith.lesson.id}`}
                      className={cx(primaryAction, "mt-5 w-full")}
                    >
                      Continue lesson
                    </Link>
                  </div>
                ) : lessonCount > 0 ? (
                  <div className={cx(heroCard, "flex items-center gap-4")}>
                    <Image alt="" className="h-20 w-20 shrink-0 scale-[1.3] object-contain" height={160} src={art.lessons} width={160} />
                    <div>
                      <p className="text-[16px] font-bold">Every lesson done</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-black/55">
                        New lessons from your teachers will appear here.
                      </p>
                    </div>
                  </div>
                ) : undefined
              }
            />
          </RevealSection>

          {courses.length === 0 ? (
            <RevealSection delay={0.06}>
              <ArtCard
                image={art.modules}
                title="No courses yet"
                description="Enroll in a course to study its modules, lessons and teacher materials."
                action={
                  <Link href="/dashboard/courses" className={primaryAction}>
                    Browse courses
                  </Link>
                }
              />
            </RevealSection>
          ) : (
            <div className={pageColumns}>
              <div className="min-w-0 space-y-12">
                {courses.map((course, courseIndex) => {
                  const courseLessons = course.chapters.flatMap((chapter) => chapter.lessons);
                  const courseDone = courseLessons.filter((lesson) => completed.has(lesson.id)).length;

                  return (
                    <RevealSection key={course.id} delay={0.06 + courseIndex * 0.04} className="space-y-5">
                      <CourseHeading
                        title={course.title}
                        slug={course.slug}
                        summary={[
                          plural(course.chapters.length, "module"),
                          plural(courseLessons.length, "lesson"),
                          ...(courseLessons.length > 0 ? [`${courseDone} done`] : []),
                        ].join(" · ")}
                      />

                      {course.chapters.length > 0 && (
                        <StaggerGrid className="grid gap-4 md:grid-cols-2">
                          {course.chapters.map((chapter, index) => (
                            <ModuleCard
                              key={chapter.id}
                              index={index}
                              title={chapter.title}
                              lessons={chapter.lessons}
                              courseSlug={course.slug}
                              completed={completed}
                            />
                          ))}
                        </StaggerGrid>
                      )}

                      {course.teacherResources.length > 0 && (
                        <section aria-labelledby={`materials-${course.id}`} className="space-y-3 pt-2">
                          <ListHeading
                            id={`materials-${course.id}`}
                            label="Teacher materials"
                            count={course.teacherResources.length}
                          />
                          <ol className={cx(card, "divide-y divide-black/[0.05]")}>
                            {course.teacherResources.map((resource) => (
                              <li key={resource.id} className="flex items-center gap-3 px-5 py-3.5 sm:gap-4 sm:px-6">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[rgba(254,198,0,0.2)] text-[#6b4c00]">
                                  <FileText aria-hidden="true" className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[15px] font-semibold text-black">{resource.title}</p>
                                  <p className="mt-0.5 text-[12px] text-black/50">
                                    {resource.type} · Shared {sharedDateFormatter.format(resource.createdAt)}
                                  </p>
                                </div>
                                <a href={resource.fileUrl} target="_blank" rel="noreferrer" className={secondaryAction}>
                                  Open
                                </a>
                              </li>
                            ))}
                          </ol>
                        </section>
                      )}

                      {course.chapters.length === 0 && course.teacherResources.length === 0 && (
                        <p className={cx(card, "px-6 py-8 text-center text-[14px] text-black/55")}>
                          No modules or materials in this course yet.
                        </p>
                      )}
                    </RevealSection>
                  );
                })}
              </div>

              <GlanceRail lede="Where your studies stand.">
                <StatCard
                  image={art.modules}
                  label="Modules"
                  value={String(moduleCount)}
                  note={`In ${plural(courses.length, "course")}`}
                />
                <StatCard
                  image={art.lessons}
                  label="Lessons done"
                  value={`${doneCount}/${lessonCount}`}
                  note={lessonCount ? `${Math.round((doneCount / lessonCount) * 100)}% of your lessons` : "No lessons yet"}
                />
                <StatCard image={art.materials} label="Materials" value={String(materialCount)} note="PDFs and handouts" />
              </GlanceRail>
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
