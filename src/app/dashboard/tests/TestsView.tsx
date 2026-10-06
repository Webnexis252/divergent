import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronDown } from "lucide-react";
import { cx } from "@/lib/cx";
import { PageHero } from "@/components/ui/page-hero";
import { PageTransition, RevealSection } from "../_components/motion-wrappers";
import {
  ArtCard,
  CourseHeading,
  CoursePill,
  GlanceRail,
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
  toTake: "/assets/dashboard/explore-tests.png",
  done: "/assets/dashboard/quick-assignment.png",
  score: "/assets/dashboard/score-stat.png",
} as const;

const DAY = 24 * 3_600_000;

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});
const dayFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" });
const monthShortFormatter = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" });
const timeFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
const longDateFormatter = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
// "2026-10": the month a test is filed under, always in IST so a test added late on the 31st doesn't slip into the next month
const monthKeyFormatter = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Asia/Kolkata" });
const monthLabelFormatter = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" });

// "not-ready": published without any questions yet
export type TestState = "in-progress" | "available" | "upcoming" | "not-ready" | "done" | "missed";

export type TestCourse = { id: string; title: string; slug: string };

export type TestItem = {
  id: string;
  title: string;
  description: string | null;
  durationMins: number;
  questionCount: number;
  availableFrom: Date | null;
  availableUntil: Date | null;
  publishedAt: Date;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  state: TestState;
  // Latest submitted attempt, for completed tests
  result: { score: number; isPassed: boolean; pendingReview: boolean } | null;
};

/**
 * The one date a test is filed under: when students could first take it, i.e.
 * the later of its publish date and its start date. A start date set before
 * publishing (often a placeholder like 1 January) doesn't count. It decides the
 * month, the order within the month and the date shown on the row, so the three
 * always agree.
 */
function testDate(test: TestItem) {
  return opensAfterPublishing(test) ? test.availableFrom! : test.publishedAt;
}

function opensAfterPublishing(test: TestItem) {
  return test.availableFrom !== null && test.availableFrom.getTime() > test.publishedAt.getTime();
}

function testHref(test: TestItem) {
  const base = `/dashboard/courses/${test.courseSlug}/tests/${test.id}`;
  return test.state === "done" ? `${base}/results` : base;
}

function StatusPill({ test, now }: { test: TestItem; now: number }) {
  switch (test.state) {
    case "in-progress":
      return <span className={cx(pill, pillTone.warn)}>In progress</span>;
    case "upcoming":
      // The row's date column already shows the day
      return <span className={cx(pill, pillTone.neutral)}>Opens at {timeFormatter.format(test.availableFrom!)}</span>;
    case "not-ready":
      return <span className={cx(pill, pillTone.neutral)}>No questions yet</span>;
    case "missed":
      return <span className={cx(pill, pillTone.neutral)}>Closed {dateTimeFormatter.format(test.availableUntil!)}</span>;
    case "done": {
      const result = test.result!;
      if (result.pendingReview) return <span className={cx(pill, pillTone.brand)}>Submitted · awaiting grading</span>;
      return result.isPassed ? (
        <span className={cx(pill, pillTone.good, "tabular-nums")}>Passed · {result.score}%</span>
      ) : (
        <span className={cx(pill, pillTone.neutral, "tabular-nums")}>Scored {result.score}%</span>
      );
    }
    default: {
      if (!test.availableUntil) return null;
      const closingSoon = test.availableUntil.getTime() - now < 2 * DAY;
      return (
        <span className={cx(pill, closingSoon ? pillTone.warn : pillTone.neutral)}>
          Closes {dateTimeFormatter.format(test.availableUntil)}
        </span>
      );
    }
  }
}

function TestAction({ test, className }: { test: TestItem; className?: string }) {
  if (test.state === "available" || test.state === "in-progress") {
    return (
      <Link href={testHref(test)} className={cx(primaryAction, className)}>
        {test.state === "in-progress" ? "Resume" : "Start"}
      </Link>
    );
  }
  if (test.state === "done") {
    return (
      <Link href={testHref(test)} className={cx(secondaryAction, className)}>
        Results
      </Link>
    );
  }
  return null;
}

function TestRow({ test, now }: { test: TestItem; now: number }) {
  const date = testDate(test);
  // Says which date the test is filed under
  const dateLabel = !opensAfterPublishing(test) ? "Published" : date.getTime() > now ? "Opens" : "Opened";

  return (
    <li className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-x-3 px-5 py-4 transition-colors hover:bg-[#f8fcff] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-5 sm:px-6">
      <time dateTime={date.toISOString()} title={`${dateLabel} ${longDateFormatter.format(date)}`}>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[1.6rem] font-bold leading-none tracking-[-0.04em] tabular-nums text-black">
            {dayFormatter.format(date)}
          </span>
          <span className="text-[13px] font-semibold text-black/55">{monthShortFormatter.format(date)}</span>
        </span>
        <span className="mt-1.5 block text-[11px] font-medium text-black/45">{dateLabel}</span>
      </time>

      <div className="min-w-0">
        <p className="text-[16px] font-semibold leading-snug text-black">{test.title}</p>
        {test.description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-black/55">{test.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusPill test={test} now={now} />
          <span className="text-[12px] font-medium tabular-nums text-black/50">
            {test.durationMins} min · {test.questionCount} {test.questionCount === 1 ? "question" : "questions"}
          </span>
        </div>
      </div>

      {/* Phones: the action sits under the text instead of squeezing it */}
      <div className="col-start-2 mt-3 justify-self-start empty:hidden sm:col-start-auto sm:mt-0">
        <TestAction test={test} />
      </div>
    </li>
  );
}

// Within a course: what can be taken now, then what opens later, then what's finished
const stateOrder: Record<TestState, number> = {
  "in-progress": 0,
  available: 1,
  upcoming: 2,
  "not-ready": 3,
  done: 4,
  missed: 5,
};

function byState(a: TestItem, b: TestItem) {
  const time = (date: Date | null, fallback: number) => date?.getTime() ?? fallback;
  return (
    stateOrder[a.state] - stateOrder[b.state] ||
    (a.state === "available" ? time(a.availableUntil, Infinity) - time(b.availableUntil, Infinity) : 0) ||
    (a.state === "upcoming" ? time(a.availableFrom, 0) - time(b.availableFrom, 0) : 0)
  );
}

/** "2 to take · 1 completed · 1 missed" */
function courseSummary(tests: TestItem[]) {
  const toTake = tests.filter((test) => stateOrder[test.state] <= stateOrder.upcoming).length;
  const done = tests.filter((test) => test.state === "done").length;
  const missed = tests.filter((test) => test.state === "missed").length;
  const parts = [
    toTake && `${toTake} to take`,
    done && `${done} completed`,
    missed && `${missed} missed`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : `${tests.length} ${tests.length === 1 ? "test" : "tests"}`;
}

export type MonthGroup = { key: string; label: string; tests: TestItem[]; toTake: number; open: boolean };

/**
 * A course's tests by month (see testDate), newest month first and newest test
 * first within it. The current month and any month with a test to take or
 * resume start open; failing both, the newest.
 */
export function groupByMonth(tests: TestItem[], now: number): MonthGroup[] {
  const currentKey = monthKeyFormatter.format(now);
  const groups = new Map<string, MonthGroup>();
  // Sort once by date, then bucket: the months come out newest first and each
  // month's tests are already in order, so no second sort can disagree with the first
  const byDate = [...tests].sort((a, b) => testDate(b).getTime() - testDate(a).getTime());
  for (const test of byDate) {
    const date = testDate(test);
    const key = monthKeyFormatter.format(date);
    const group = groups.get(key) ?? { key, label: monthLabelFormatter.format(date), tests: [], toTake: 0, open: false };
    group.tests.push(test);
    if (stateOrder[test.state] <= stateOrder.upcoming) group.toTake += 1;
    if (key === currentKey || test.state === "in-progress" || test.state === "available") group.open = true;
    groups.set(key, group);
  }
  const months = [...groups.values()];
  if (!months.some((month) => month.open)) months[0].open = true;
  return months;
}

function MonthDropdown({ month, now }: { month: MonthGroup; now: number }) {
  return (
    <details open={month.open} className="group/month">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#f8fcff] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-(--brand-primary-soft)", brandInk)}>
          <CalendarDays aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-black">{month.label}</span>
          <span className="block text-[12px] tabular-nums text-black/50">
            {month.tests.length} {month.tests.length === 1 ? "test" : "tests"}
          </span>
        </span>
        {month.toTake > 0 && <span className={cx(pill, pillTone.brand, "tabular-nums")}>{month.toTake} to take</span>}
        <ChevronDown
          aria-hidden="true"
          className="h-5 w-5 shrink-0 text-black/40 transition-transform group-open/month:rotate-180"
        />
      </summary>
      <ol className="divide-y divide-black/[0.05] border-t border-black/[0.05]">
        {month.tests.map((test) => (
          <TestRow key={test.id} test={test} now={now} />
        ))}
      </ol>
    </details>
  );
}

/** The student's tests grouped by course; `now` is when they were loaded. */
export function TestsView({ courses, tests, now }: { courses: TestCourse[]; tests: TestItem[]; now: number }) {
  const sorted = [...tests].sort(byState);
  const toTake = sorted.filter((test) => stateOrder[test.state] <= stateOrder.upcoming);
  const done = sorted.filter((test) => test.state === "done");

  // Courses with something to take first, then alphabetically; courses without tests are listed at the end
  const courseSections = courses
    .map((course) => ({ ...course, tests: sorted.filter((test) => test.courseId === course.id) }))
    .filter((course) => course.tests.length > 0)
    .sort((a, b) => stateOrder[a.tests[0].state] - stateOrder[b.tests[0].state] || a.title.localeCompare(b.title));
  const coursesWithoutTests = courses.filter((course) => !tests.some((test) => test.courseId === course.id));

  const count = (state: TestState) => toTake.filter((test) => test.state === state).length;
  const [inProgressCount, readyCount, upcomingCount] = [count("in-progress"), count("available"), count("upcoming")];
  const graded = done.filter((test) => !test.result!.pendingReview);
  const averageScore = graded.length
    ? Math.round(graded.reduce((sum, test) => sum + test.result!.score, 0) / graded.length)
    : null;
  const upNext = toTake[0]?.state === "upcoming" ? null : toTake[0];

  const heroSummary =
    courses.length === 0
      ? "Enroll in a course to unlock its tests."
      : tests.length === 0
        ? "Tests from your courses will show up here."
        : inProgressCount + readyCount === 0
          ? `All caught up. ${done.length} ${done.length === 1 ? "test" : "tests"} completed.`
          : [
              inProgressCount && `${inProgressCount} in progress`,
              readyCount && `${readyCount} ready to start`,
            ]
              .filter(Boolean)
              .join(", ") + `. ${done.length} completed.`;

  return (
    <PageTransition>
      {/* overflow-x-clip, not hidden: hidden makes <main> a scroll container and breaks the sticky rail */}
      <main className={pageMain}>
        <section className={pageSection}>
          <RevealSection>
            <PageHero
              eyebrow="Tests"
              title="Your Tests & Exams"
              description={<p>{heroSummary}</p>}
              aside={
                upNext ? (
                  <div className={heroCard}>
                    <div className="flex items-center justify-between gap-3">
                      <span className={cx(pill, upNext.state === "in-progress" ? pillTone.warn : pillTone.brand)}>
                        {upNext.state === "in-progress" ? "In progress" : "Up next"}
                      </span>
                      <span className="text-[12px] font-medium tabular-nums text-black/50">
                        {upNext.durationMins} min · {upNext.questionCount} questions
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-[17px] font-bold leading-snug">{upNext.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <CoursePill title={upNext.courseTitle} />
                      {upNext.state === "available" && <StatusPill test={upNext} now={now} />}
                    </div>
                    <Link href={testHref(upNext)} className={cx(primaryAction, "mt-5 w-full")}>
                      {upNext.state === "in-progress" ? "Resume test" : "Start test"}
                    </Link>
                  </div>
                ) : done.length > 0 ? (
                  <div className={cx(heroCard, "flex items-center gap-4")}>
                    <Image alt="" className="h-20 w-20 shrink-0 scale-[1.3] object-contain" height={160} src={art.done} width={160} />
                    <div>
                      <p className="text-[16px] font-bold">All caught up</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-black/55">
                        New tests from your teachers will appear here.
                      </p>
                    </div>
                  </div>
                ) : undefined
              }
            />
          </RevealSection>

          {tests.length === 0 ? (
            <RevealSection delay={0.06}>
              {courses.length === 0 ? (
                <ArtCard
                  image={art.toTake}
                  title="No courses yet"
                  description="Enroll in a course to take its chapter tests, mock tests and exams."
                  action={
                    <Link href="/dashboard/courses" className={primaryAction}>
                      Browse courses
                    </Link>
                  }
                />
              ) : (
                <ArtCard
                  image={art.toTake}
                  title="No tests yet"
                  description="When your teachers publish tests in your courses, they'll appear here."
                />
              )}
            </RevealSection>
          ) : (
            <div className={pageColumns}>
              <div className="min-w-0 space-y-12">
                {courseSections.map((course, index) => (
                  <RevealSection key={course.id} delay={0.06 + index * 0.04} className="space-y-5">
                    <CourseHeading title={course.title} slug={course.slug} summary={courseSummary(course.tests)} />
                    <div className={cx(card, "divide-y divide-black/[0.06]")}>
                      {groupByMonth(course.tests, now).map((month) => (
                        <MonthDropdown key={month.key} month={month} now={now} />
                      ))}
                    </div>
                  </RevealSection>
                ))}

                {coursesWithoutTests.length > 0 && (
                  <RevealSection delay={0.1}>
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-black/55">
                      <span>No tests yet in</span>
                      {coursesWithoutTests.map((course) => (
                        <CoursePill key={course.id} title={course.title} />
                      ))}
                    </div>
                  </RevealSection>
                )}
              </div>

              <GlanceRail lede="Where your tests stand.">
                <StatCard
                  image={art.toTake}
                  label="To take"
                  value={String(toTake.length)}
                  note={upcomingCount ? `${upcomingCount} not open yet` : "Open right now"}
                />
                <StatCard image={art.done} label="Completed" value={String(done.length)} note="Submitted tests" />
                <StatCard
                  image={art.score}
                  label="Average score"
                  value={averageScore === null ? "–" : `${averageScore}%`}
                  note={graded.length ? `Across ${graded.length} graded` : "No graded tests yet"}
                />
              </GlanceRail>
            </div>
          )}
        </section>
      </main>
    </PageTransition>
  );
}
