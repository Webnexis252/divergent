import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getPageAuth } from "@/lib/page-auth";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { EnrollmentStatus } from "@prisma/client";
import {
  AnimCard,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "../_components/motion-wrappers";
import { GlobalSearch } from "@/components/global-search";
import { NotificationsDropdown } from "@/components/notifications-dropdown";
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Calendar 
} from "lucide-react";

export const dynamic = "force-dynamic";

const assets = {
  headerAvatar: "https://api.dicebear.com/9.x/shapes/svg?seed=021745ae-afe4-4dce-ad5c-2dd5ad2195e1",
  bell: "https://api.dicebear.com/9.x/shapes/svg?seed=92fab2e3-ea1c-457a-9960-57a498a07bd3",
  currentCourseFallback:
    "https://api.dicebear.com/9.x/shapes/svg?seed=973b6412-1165-4257-8071-b30234e453cb",
  exploreModules: "/assets/dashboard/explore-modules.png",
  exploreTests: "/assets/dashboard/explore-tests.png",
  exploreLibrary: "/assets/dashboard/explore-library.png",
  dashboardIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=cf63ebaf-2c2d-461d-b303-52e41d36c645",
  coursesIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=f5a0a60c-baa8-428d-b6e0-24fe7150e184",
  liveClassesIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=95f74062-c186-4036-9109-4876860c1840",
  communityIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=2adf51c8-f658-4f1e-84e4-26a5345706d5",
  assignmentsIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=ffea850b-8a37-4bd9-9bcf-92f2122bf9d0",
  progressIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=4c09dd54-76f0-47cb-81bd-6df94c0bdcf9",
  calendarIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=4853766a-1632-4bc4-912e-5e43efdf5ec1",
} as const;

import { studentNavItems } from "../_components/nav-items";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import { PaginatedCourses } from "./paginated-courses";
import { AvailableBundles } from "./available-bundles";

const sidebarItems = studentNavItems.map(item => ({
  ...item,
  active: item.href === "/dashboard/courses"
}));

const exploreItems = [
  { label: "Modules", image: assets.exploreModules, target: "current-course" as const },
  { label: "Tests", image: assets.exploreTests, target: "tests" as const },
  { label: "Library", image: assets.exploreLibrary, target: "catalog" as const },
] as const;

function workspaceButtonStyles({
  variant = "primary",
  className,
}: {
  variant?: "primary" | "soft";
  className?: string;
}) {
  return cx(
    "inline-flex items-center justify-center rounded-[10px] font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5",
    variant === "primary"
      ? "bg-[#38c1ff] text-white shadow-[0_4px_12px_rgba(56,193,255,0.28)]"
      : "bg-white text-[#38c1ff] shadow-[0_2px_8px_rgba(0,0,0,0.08)]",
    className,
  );
}

function formatPrice(price: number) {
  return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free";
}

function formatStudentCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k students`;
  }

  return `${value} student${value === 1 ? "" : "s"}`;
}

function countLessons(chapters: Array<{ lessons: Array<{ id: string }> }>) {
  return chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
}

async function getRecentStudentEnrollments(userId: string) {
  const baseQuery = {
    orderBy: { updatedAt: "desc" as const },
    take: 4,
    select: {
      progressPercent: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnail: true,
          description: true,
          price: true,
          isPublished: true,
          teachers: {
            select: { name: true },
          },
          _count: {
            select: {
              chapters: true,
              tests: true,
            },
          },
          chapters: {
            where: { isPublished: true },
            select: {
              lessons: {
                where: { isPublished: true },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  };

  try {
    return await prisma.enrollment.findMany({
      where: {
        userId,
        status: EnrollmentStatus.ACTIVE,
      },
      ...baseQuery,
    });
  } catch {
    return prisma.enrollment.findMany({
      where: { userId },
      ...baseQuery,
    });
  }
}

export default async function DashboardCoursesPage() {
  const auth = await getPageAuth(["STUDENT"]);

  let viewer = null;
  let activeEnrollments: Awaited<ReturnType<typeof getRecentStudentEnrollments>> = [];
  let courses: Array<{ id: string; title: string; slug: string; description: string | null; thumbnail: string | null; price: number; teachers: { name: string | null }[]; _count: { enrollments: number } }> = [];
  let bundles: any[] = [];
  let dbError = false;

  try {
    [viewer, activeEnrollments, courses, bundles] = await Promise.all([
      auth?.userId
        ? prisma.user.findUnique({
            where: { id: auth.userId },
            select: { name: true, email: true },
          })
        : null,
      auth?.userId
        ? getRecentStudentEnrollments(auth.userId)
        : [],
      prisma.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          price: true,
          teachers: {
            select: { name: true },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.bundle.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          thumbnail: true,
          price: true,
          courses: { select: { course: { select: { title: true } } } }
        },
        orderBy: { createdAt: "desc" }
      })
    ]);
  } catch (err) {
    console.error('[CoursesPage] DB error:', err);
    dbError = true;
  }

  const currentEnrollment =
    activeEnrollments.find((enrollment) => enrollment.course.isPublished) ?? null;
  const displayName = viewer?.name?.trim() || "Student";
  const activeCourse = currentEnrollment?.course ?? null;
  const activeCourseLessonCount = activeCourse ? countLessons(activeCourse.chapters) : 0;

  // Fetch real completed lesson count for the active course
  const activeCourseAllLessonIds = activeCourse
    ? activeCourse.chapters.flatMap((ch) => ch.lessons.map((l) => l.id))
    : [];
  let activeCourseCompletedCount = 0;
  if (auth?.userId && activeCourseAllLessonIds.length > 0) {
    activeCourseCompletedCount = await prisma.lessonProgress.count({
      where: {
        userId: auth.userId,
        isCompleted: true,
        lessonId: { in: activeCourseAllLessonIds },
      },
    });
  }

  const activeCourseProgress =
    activeCourseLessonCount > 0
      ? Math.round((activeCourseCompletedCount / activeCourseLessonCount) * 100)
      : Math.max(0, Math.min(100, Math.round(currentEnrollment?.progressPercent ?? 0)));

  const exploreLinks = {
    currentCourse: "/dashboard/modules",
    tests: "/dashboard/tests",
    catalog: "/dashboard/library",
  } as const;

  if (dbError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f9fafb] p-8">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Couldn&apos;t load courses</h1>
          <p className="mb-6 text-sm text-gray-500">We&apos;re having trouble connecting to the database. This is temporary — please try again in a moment.</p>
          <a href="/dashboard/courses" className="inline-block rounded-xl bg-[#38c1ff] px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90">Retry</a>
        </div>
      </main>
    );
  }

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">


        <div className="mx-auto max-w-[1920px] px-4 py-6 sm:px-6 lg:px-8 xl:px-0 xl:py-8">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <DashboardSidebar />

            <section className="min-w-0 px-0 sm:px-4 xl:pr-10">
              <div className="mx-auto max-w-[1160px] space-y-10">
                <div className="flex flex-col gap-10">
                  <RevealSection className="space-y-6">
                    <div id="current-course">
                      <h1 className="text-[clamp(1.9rem,3vw,2rem)] font-medium text-black">
                        Currently logged in course
                      </h1>
                    </div>

                    {activeCourse ? (
                      <AnimCard>
                        <article className="max-w-[420px] overflow-hidden rounded-[20px] bg-white p-[12px] shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
                          <div className="relative overflow-hidden rounded-[18px] bg-[#dcdcdc]">
                            <div
                              aria-hidden="true"
                              className="h-[160px] w-full bg-cover bg-center"
                              style={{
                                backgroundImage: activeCourse.thumbnail
                                  ? `linear-gradient(180deg, rgba(8, 16, 24, 0.05), rgba(8, 16, 24, 0.2)), url("${activeCourse.thumbnail}")`
                                  : `url("${assets.currentCourseFallback}")`,
                              }}
                            />
                            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-3">
                              <span className="rounded-full bg-white px-2 py-1 text-[8px] font-semibold text-[#ff5e2f]">
                                {activeCourseProgress}% Completed
                              </span>
                              <span className="rounded-full bg-white px-2 py-1 text-[8px] font-semibold text-black/72">
                                {activeCourse._count.chapters} Modules
                              </span>
                            </div>
                          </div>

                          <div className="pt-3">
                            <h2 className="max-w-[18rem] text-[clamp(1.2rem,2vw,1.35rem)] font-medium leading-[1.08] text-black">
                              {activeCourse.title}
                            </h2>
                            <p className="mt-1 text-[11px] text-[#8b8888]">
                              by {activeCourse.teachers?.[0]?.name ?? "Expert Mentors"}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-[#4caf50]">
                              {activeCourseCompletedCount} / {activeCourseLessonCount} lessons completed
                              {activeCourse._count.tests > 0 ? ` • ${activeCourse._count.tests} tests` : ""}
                            </p>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
                                <div
                                  className="h-full rounded-full bg-[linear-gradient(90deg,#4caf50,#38c1ff)]"
                                  style={{ width: `${activeCourseProgress}%` }}
                                />
                              </div>

                              <Link
                                className={workspaceButtonStyles({
                                  className: "h-[34px] px-4 text-[13px]",
                                })}
                                href="/dashboard/live-classes"
                              >
                                Continue Learning
                              </Link>
                            </div>
                          </div>
                        </article>
                      </AnimCard>
                    ) : (
                      <AnimCard>
                        <article className="max-w-[420px] rounded-[20px] bg-white px-6 py-7 shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
                          <p className="text-[1.15rem] font-semibold text-black">No active course yet</p>
                          <p className="mt-3 text-[14px] leading-7 text-black/58">
                            As soon as you enroll in a program, it will appear here with your progress
                            and the fastest route back into the lessons.
                          </p>
                          <Link
                            className={workspaceButtonStyles({
                              className: "mt-5 h-[38px] px-4 text-[13px]",
                            })}
                            href="#course-catalog"
                          >
                            Browse Courses
                          </Link>
                        </article>
                      </AnimCard>
                    )}
                  </RevealSection>

                  <RevealSection className="space-y-6" delay={0.06}>
                    <div>
                      <h2 className="text-[clamp(1.9rem,3vw,2rem)] font-medium text-black">Explore</h2>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {exploreItems.map((item) => (
                        <AnimCard key={item.label}>
                          <Link
                            className="flex h-[179px] flex-col items-center justify-center gap-2 rounded-[20px] bg-[#71d3ff] px-6 py-5 text-center text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                            href={
                              item.target === "current-course"
                                ? exploreLinks.currentCourse
                                : item.target === "tests"
                                  ? exploreLinks.tests
                                  : exploreLinks.catalog
                            }
                          >
                            <Image
                              alt={item.label}
                              className="h-auto w-[140px] object-contain drop-shadow-2xl"
                              height={140}
                              src={item.image}
                              width={140}
                            />
                            <span className="text-[24px] font-semibold">{item.label}</span>
                          </Link>
                        </AnimCard>
                      ))}
                    </div>
                  </RevealSection>
                </div>

                {bundles.length > 0 && (
                  <RevealSection delay={0.06}>
                    <div className="mb-10" id="bundles">
                      <AvailableBundles bundles={bundles} userId={auth?.userId ?? ""} />
                    </div>
                  </RevealSection>
                )}

                <RevealSection delay={0.08}>
                  <div className="space-y-6" id="course-catalog">
                    <div>
                      <h2 className="text-[clamp(1.9rem,3vw,2rem)] font-medium text-black">Courses</h2>
                    </div>

                    <PaginatedCourses courses={courses} />
                  </div>
                </RevealSection>
              </div>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
