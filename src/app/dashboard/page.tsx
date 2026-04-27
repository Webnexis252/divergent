"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  House,
  NotebookPen,
  Video,
  MessageSquareText,
  CircleHelp,
  Award,
  UserCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import {
  FloatPulse,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "./_components/motion-wrappers";
import type { DashboardStats, EnrolledCourse } from "./_types";
import type { UpcomingOverviewResponse } from "@/lib/upcoming-overview";
import { AnnouncementsPanel } from "./_components/announcements-panel";

const assets = {
  bannerIllustration: "https://www.figma.com/api/mcp/asset/ed4da357-c8f5-410a-8e68-45347e8c1af8",
  bell: "https://www.figma.com/api/mcp/asset/00ad5465-b013-404e-ace0-32e8775e166b",
  headerAvatar: "https://www.figma.com/api/mcp/asset/a837ccce-b7e2-4308-895f-5d48fccd59c5",
  courseStat: "https://www.figma.com/api/mcp/asset/5890be02-a91e-46c1-86e1-2c309e51e4c9",
  streakStat: "https://www.figma.com/api/mcp/asset/78a502ad-9c8c-4041-b5b4-0820b424e6b5",
  scoreStat: "https://www.figma.com/api/mcp/asset/3fda4e93-3e77-4bb0-8b50-0d4624b13ec4",
  profileAvatar: "https://www.figma.com/api/mcp/asset/fc3f5059-8416-4446-afdc-6f0f59d0684a",
  quickClasses: "https://www.figma.com/api/mcp/asset/eca2f1b3-8eda-4618-ad15-f4480af00794",
  quickExam: "https://www.figma.com/api/mcp/asset/7f05925d-67c8-48cc-8236-da89d98f6254",
  quickAssignment: "https://www.figma.com/api/mcp/asset/ad53f3b3-4ffe-4ea7-a943-e1f9db54a171",
} as const;

const overviewNavItems: Array<{
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}> = [
  { label: "Dashboard", href: "/dashboard", icon: House, active: true },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Live Classes", href: "/dashboard/live-classes", icon: Video },
  { label: "Community", href: "/dashboard/community", icon: MessageSquareText },
  { label: "Doubts", href: "/dashboard/doubts", icon: CircleHelp },
  { label: "Assignments", href: "/dashboard/assignments", icon: NotebookPen },
  { label: "Progress", href: "/dashboard/progress", icon: ChartNoAxesColumn },
  { label: "Certificates", href: "/dashboard/certificates", icon: Award },
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
] as const;

function overviewButtonStyles({
  tone = "primary",
  className,
}: {
  tone?: "primary" | "secondary";
  className?: string;
}) {
  return cx(
    "inline-flex items-center justify-center rounded-[10px] font-medium transition-transform duration-[var(--transition-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5",
    tone === "primary"
      ? "bg-[#38c1ff] text-white shadow-[0_4px_12px_rgba(56,193,255,0.3)]"
      : "border border-[#38c1ff] bg-white text-[#38c1ff]",
    className,
  );
}

function OverviewSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <motion.aside
      animate={{ opacity: 1, x: 0 }}
      className="overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] px-4 py-4 shadow-[0_18px_48px_rgba(254,198,0,0.18)] xl:sticky xl:top-6 xl:min-h-[530px] xl:rounded-l-[0] xl:rounded-r-[40px] xl:px-7 xl:py-12"
      initial={{ opacity: 0, x: -14 }}
      transition={{ duration: 0.32 }}
    >
      <nav className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:gap-1 xl:overflow-visible">
        {overviewNavItems.map((item) => {
          let href: string = item.href;
          if (item.label === "Profile" && user?.role === "MENTOR") {
            href = "/dashboard/teacher/profile";
          }
          const Icon = item.icon;

          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <motion.div
              key={item.href}
              transition={{ duration: 0.18 }}
              whileHover={{ x: 2 }}
            >
              <Link
                className={cx(
                  "flex min-w-max items-center gap-3 rounded-[22px] px-4 py-3 text-[15px] font-medium text-black transition-colors duration-[var(--transition-fast)] xl:min-h-[56px] xl:px-5 xl:text-[18px]",
                  active && "bg-white/16",
                )}
                href={href}
              >
                <Icon className="h-4.5 w-4.5 xl:h-5 xl:w-5" />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </motion.aside>
  );
}

function OverviewStatCard({
  title,
  value,
  image,
}: {
  title: string;
  value: string;
  image: string;
}) {
  return (
    <motion.article
      className="rounded-[20px] bg-[#72d3ff] px-5 py-4 text-white shadow-[0_4px_9.2px_rgba(0,0,0,0.25)]"
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
    >
      <div className="flex items-start justify-between gap-4">
        <Image
          alt={title}
          className="h-auto w-[5.5rem] object-contain sm:w-[6.8rem]"
          height={96}
          src={image}
          width={109}
        />
        <p className="pt-3 text-[clamp(2.6rem,6vw,3.75rem)] leading-none text-[#fec600]">
          {value}
        </p>
      </div>
      <p className="mt-4 text-[clamp(1rem,2vw,1.5rem)] font-semibold text-white">{title}</p>
    </motion.article>
  );
}

function OverviewCourseCard({ course }: { course: EnrolledCourse }) {
  const progress = Math.max(0, Math.min(100, Math.round(course.progressPercent)));
  const teacherLabel = course.teacherName ?? "Divergent faculty";

  return (
    <motion.article
      className="overflow-hidden rounded-[20px] bg-white p-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
      transition={{ duration: 0.2 }}
      whileHover={{ y: -4 }}
    >
      <div className="relative overflow-hidden rounded-[16px] bg-[#e0e0e0]">
        <div
          aria-hidden="true"
          className={cx(
            "h-[170px] w-full bg-[linear-gradient(135deg,rgba(56,193,255,0.12),rgba(15,23,42,0.06))] bg-cover bg-center",
            !course.thumbnail && "grid place-items-center",
          )}
          style={course.thumbnail ? { backgroundImage: `url("${course.thumbnail}")` } : undefined}
        >
          {course.thumbnail ? null : (
            <BookOpen className="h-9 w-9 text-[var(--brand-primary-dark)]" />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-[#ff5e2f] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            {progress}% Completed
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-semibold text-black/70 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            Enrolled
          </span>
        </div>
      </div>

      <div className="px-1 pb-1 pt-3">
        <h3 className="line-clamp-2 text-[clamp(1.1rem,2vw,1.35rem)] font-medium leading-[1.1] text-black">
          {course.title}
        </h3>
        <p className="mt-1 text-[11px] text-[#8b8888]">by {teacherLabel}</p>
        <p className="mt-1 text-[11px] text-black/78">{course.meta}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#ff6b3d,#38c1ff)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <Link
            className={overviewButtonStyles({
              className: "h-[34px] min-w-[132px] px-3 text-[14px]",
            })}
            href={`/dashboard/courses/${course.slug}`}
          >
            Continue Learning
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function QuickStartCard({
  href,
  image,
  label,
  value,
}: {
  href: string;
  image: string;
  label: string;
  value: string;
}) {
  return (
    <motion.div transition={{ duration: 0.2 }} whileHover={{ y: -3 }}>
      <Link
        className="flex items-center gap-4 rounded-[24px] bg-[#72d3ff] px-4 py-3 shadow-[0_4px_9.2px_rgba(0,0,0,0.18)]"
        href={href}
      >
        <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[18px] bg-white">
          <Image alt={label} className="h-auto w-[2.9rem] object-contain" height={73} src={image} width={74} />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <p className="text-[18px] font-semibold text-white">{label}</p>
          <p className="text-[clamp(2.2rem,5vw,3.75rem)] leading-none text-[#fec600]">{value}</p>
        </div>
      </Link>
    </motion.div>
  );
}

function DashboardTopBar({ displayName, userImage }: { displayName: string; userImage?: string | null }) {
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-black/5 bg-white/82 backdrop-blur-xl"
      initial={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28 }}
    >
      <div className="mx-auto flex max-w-[1920px] items-center gap-4 px-5 py-4 sm:px-6 lg:px-8 xl:px-14">
        <Link className="shrink-0" href="/dashboard">
          <Image
            alt={brand.fullName}
            className="h-auto w-[150px] object-contain sm:w-[177px]"
            height={74}
            priority
            src={brand.logoSrc}
            width={177}
          />
        </Link>

        <div className="hidden min-w-0 flex-1 lg:block">
          <GlobalSearch />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <NotificationsDropdown />

          <Link href="/dashboard/profile" className="flex items-center gap-2.5 rounded-full transition-opacity hover:opacity-80">
            {/* Avatar with purple ring */}
            <div className="relative h-[48px] w-[48px] shrink-0">
              <div className="absolute inset-0 rounded-full bg-[#925fe2] p-[3px]">
                <div className="h-full w-full overflow-hidden rounded-full bg-[var(--brand-primary-strong)] shadow-[8px_8px_48px_8px_rgba(0,0,0,0.24)]">
                  {userImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={displayName}
                      src={userImage}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[14px] font-semibold text-white">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="hidden text-[15px] font-semibold text-black sm:block">{displayName}</p>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overview, setOverview] = useState<UpcomingOverviewResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/users/me/stats")
        .then((response) => response.json())
        .catch(() => null),
      fetch("/api/users/me/upcoming-overview")
        .then((response) => response.json())
        .catch(() => null),
    ])
      .then(([statsPayload, overviewPayload]) => {
        if (!active) return;

        if (statsPayload?.success) {
          setStats(statsPayload.data);
        }

        if (overviewPayload?.success) {
          setOverview(overviewPayload.data);
        }
      })
      .finally(() => {
        if (!active) return;
        setStatsLoading(false);
        setOverviewLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-10 w-10 border-[var(--brand-primary)] text-[var(--brand-primary)]" />
      </div>
    );
  }

  const displayName = user?.name?.trim() || "Student";
  const firstName = displayName.split(" ")[0] || "Student";
  const displayEmail = user?.email ?? "student@divergent.in";
  const enrolledCourses = stats?.enrolledCourses ?? [];
  const featuredCourses = enrolledCourses.slice(0, 2);

  const quickStartItems = [
    {
      label: "Classes",
      href: "/dashboard/upcoming",
      image: assets.quickClasses,
      value: overviewLoading ? "…" : String(overview?.counts.upcomingClasses ?? 0),
    },
    {
      label: "Exam",
      href: overview?.nextExam?.ctaHref ?? "/dashboard/courses",
      image: assets.quickExam,
      value: overviewLoading ? "…" : String(overview?.counts.openExams ?? 0),
    },
    {
      label: "Assignment",
      href: "/dashboard/assignments",
      image: assets.quickAssignment,
      value: overviewLoading ? "…" : String(overview?.counts.pendingAssignments ?? 0),
    },
  ] as const;

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f7f5f4]">
        <DashboardTopBar displayName={displayName} userImage={user?.image} />

        <div className="mx-auto max-w-[1920px] px-4 py-6 sm:px-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <div className="xl:pr-7">
              <OverviewSidebar />
            </div>

            <section className="space-y-6 px-0 xl:pr-10">
              <RevealSection>
                <div className="relative overflow-hidden rounded-[24px] bg-[#38c1ff] px-6 py-6 text-white shadow-[0_4px_9.2px_rgba(0,0,0,0.2)] sm:px-10 sm:py-7">
                  <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(250px,323px)]">
                    <div className="max-w-[33rem]">
                      <p className="text-[16px] text-white/92">{displayDate}</p>
                      <h1 className="mt-5 text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em] text-white">
                        Welcome back, {firstName}!
                      </h1>
                      <p className="mt-2 text-[clamp(1.05rem,2vw,1.5rem)] text-white/92">
                        Always stay updated in your student portal
                      </p>
                    </div>

                    <FloatPulse className="mx-auto flex w-full max-w-[323px] justify-center lg:justify-end">
                      <Image
                        alt="Student dashboard illustration"
                        className="h-auto w-full max-w-[323px] object-contain"
                        height={300}
                        priority
                        src={assets.bannerIllustration}
                        width={323}
                      />
                    </FloatPulse>
                  </div>
                </div>
              </RevealSection>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_293px]">
                <div className="space-y-8">
                  <StaggerGrid className="grid gap-4 md:grid-cols-3">
                    <OverviewStatCard
                      image={assets.courseStat}
                      title="Courses Enrolled"
                      value={statsLoading ? "…" : String(stats?.enrollmentCount ?? 0)}
                    />
                    <OverviewStatCard
                      image={assets.streakStat}
                      title="Current Streak"
                      value={statsLoading ? "…" : String(stats?.streakCount ?? 0)}
                    />
                    <OverviewStatCard
                      image={assets.scoreStat}
                      title="Current Score"
                      value={statsLoading ? "…" : String(stats?.xpPoints ?? 0)}
                    />
                  </StaggerGrid>

                  <RevealSection delay={0.05}>
                    <AnnouncementsPanel />
                  </RevealSection>

                  <RevealSection delay={0.06} className="xl:max-w-[760px]">
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-[clamp(1.8rem,3vw,2rem)] font-medium text-black">
                          Currently Joined Courses
                        </h2>
                        <p className="mt-2 text-[15px] text-black/56">
                          Continue exactly where you left off and jump back into your most active tracks.
                        </p>
                      </div>

                      {statsLoading ? (
                        <div className="flex min-h-[12rem] items-center justify-center rounded-[20px] bg-white shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
                          <div className="flex items-center gap-3 text-[var(--text-muted)]">
                            <Spinner className="h-5 w-5 border-[var(--brand-primary)] text-[var(--brand-primary)]" />
                            Loading your courses
                          </div>
                        </div>
                      ) : featuredCourses.length === 0 ? (
                        <div className="rounded-[20px] bg-white px-6 py-8 shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
                          <p className="text-[20px] font-medium text-black">No courses joined yet</p>
                          <p className="mt-2 max-w-[32rem] text-[15px] leading-7 text-black/58">
                            Once you enroll in a course, it will show up here with progress, teacher context, and a direct route back into the work.
                          </p>
                          <Link
                            className={overviewButtonStyles({
                              className: "mt-5 h-[42px] px-5 text-[15px]",
                            })}
                            href="/dashboard/courses"
                          >
                            Browse Courses
                          </Link>
                        </div>
                      ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                          {featuredCourses.map((course) => (
                            <OverviewCourseCard key={course.id} course={course} />
                          ))}
                        </div>
                      )}
                    </div>
                  </RevealSection>
                </div>

                <div className="space-y-6">
                  <RevealSection delay={0.08}>
                    <div className="relative overflow-hidden rounded-[20px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(237,245,246,0.92))] px-6 py-8 shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
                      <div className="flex flex-col items-center text-center">
                        {/* Real profile photo with purple ring */}
                        <Link href="/dashboard/profile" className="group relative h-[106px] w-[106px]">
                          <div className="absolute inset-0 rounded-full bg-[#925fe2] p-[3.5px]">
                            <div className="h-full w-full overflow-hidden rounded-full bg-[var(--brand-primary-strong)] shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
                              {user?.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  alt={displayName}
                                  src={user.image}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[24px] font-bold text-white">
                                  {displayName.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white" stroke="currentColor" strokeWidth="2">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                              <circle cx="12" cy="13" r="4"/>
                            </svg>
                          </div>
                        </Link>
                        <p className="mt-6 text-[20px] font-semibold text-black">{displayName}</p>
                        <p className="mt-1 text-[14px] text-black/55">{displayEmail}</p>
                      </div>
                    </div>
                  </RevealSection>

                  <RevealSection delay={0.12}>
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-[clamp(1.9rem,3vw,2rem)] font-semibold text-black">
                          Quick Start
                        </h2>
                        <p className="mt-1 text-[14px] text-black/54">
                          Shortcuts into the next thing that matters.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {quickStartItems.map((item) => (
                          <QuickStartCard
                            key={item.label}
                            href={item.href}
                            image={item.image}
                            label={item.label}
                            value={item.value}
                          />
                        ))}
                      </div>
                    </div>
                  </RevealSection>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
