import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { EnrollmentStatus } from "@prisma/client";
import {
  AnimCard,
  RevealSection,
} from "../../_components/motion-wrappers";
import { unstable_cache } from "next/cache";
import { CatalogWithFilter } from "../catalog-with-filter";
import { cx } from "@/lib/cx";

const assets = {
  currentCourseFallback: "https://api.dicebear.com/9.x/shapes/svg?seed=973b6412-1165-4257-8071-b30234e453cb",
  exploreModules: "/assets/dashboard/explore-modules.png",
  exploreTests: "/assets/dashboard/explore-tests.png",
  exploreLibrary: "/assets/dashboard/explore-library.png",
} as const;

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

const getCachedCatalog = unstable_cache(
  async () => {
    const [courses, bundles] = await Promise.all([
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
          courses: { select: { course: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { courses, bundles };
  },
  ["catalog-data"],
  { tags: ["courses", "bundles"] }
);

export async function DashboardContent({ userId }: { userId: string | undefined }) {
  let viewer = null;
  let activeEnrollments: Awaited<ReturnType<typeof getRecentStudentEnrollments>> = [];
  let courses: any[] = [];
  let bundles: any[] = [];
  let dbError = false;
  let completedLessonIds = new Set<string>();

  const getUserData = async (uid: string) => {
    const [viewer, enrollments, userCompletedLessons] = await Promise.all([
      prisma.user.findUnique({
        where: { id: uid },
        select: { name: true, email: true },
      }),
      getRecentStudentEnrollments(uid),
      prisma.lessonProgress.findMany({
        where: {
          userId: uid,
          isCompleted: true,
        },
        select: { lessonId: true },
      }),
    ]);
    return { viewer, enrollments, userCompletedLessons };
  };

  try {
    const catalogPromise = getCachedCatalog();
    
    if (userId) {
      const userData = await getUserData(userId);
      viewer = userData.viewer;
      activeEnrollments = userData.enrollments;
      completedLessonIds = new Set(userData.userCompletedLessons.map(l => l.lessonId));
    }

    const catalogData = await catalogPromise;
    courses = catalogData.courses;
    bundles = catalogData.bundles;
  } catch (err) {
    console.error('[CoursesPage] DB error:', err);
    dbError = true;
  }

  const publishedEnrollments = activeEnrollments.filter(e => e.course.isPublished);

  const exploreLinks = {
    currentCourse: "/dashboard/modules",
    tests: "/dashboard/tests",
    catalog: "/dashboard/library",
  } as const;

  if (dbError) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Couldn&apos;t load courses</h1>
          <p className="mb-6 text-sm text-gray-500">We&apos;re having trouble connecting to the database. This is temporary — please try again in a moment.</p>
          <a href="/dashboard/courses" className="inline-block rounded-xl bg-[#38c1ff] px-6 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90">Retry</a>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1160px] space-y-10">
      {publishedEnrollments.length > 0 && (
        <div className="flex flex-col gap-10">
          <RevealSection className="space-y-6">
            <div id="current-course">
              <h1 className="text-[clamp(1.9rem,3vw,2rem)] font-medium text-black">
                {publishedEnrollments.length > 1 ? "Currently logged in courses" : "Currently logged in course"}
              </h1>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {publishedEnrollments.map((enrollment) => {
                const course = enrollment.course;
                const lessonCount = countLessons(course.chapters);
                const courseLessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
                const completedCount = courseLessonIds.filter(id => completedLessonIds.has(id)).length;
                const progress = lessonCount > 0
                  ? Math.round((completedCount / lessonCount) * 100)
                  : Math.max(0, Math.min(100, Math.round(enrollment.progressPercent ?? 0)));

                return (
                  <AnimCard key={enrollment.course.id}>
                    <article className="h-full overflow-hidden rounded-[20px] bg-white p-[12px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] flex flex-col">
                      <div className="relative overflow-hidden rounded-[18px] bg-[#dcdcdc] shrink-0">
                        <div
                          aria-hidden="true"
                          className="h-[160px] w-full bg-cover bg-center"
                          style={{
                            backgroundImage: course.thumbnail
                              ? `linear-gradient(180deg, rgba(8, 16, 24, 0.05), rgba(8, 16, 24, 0.2)), url("${course.thumbnail}")`
                              : `url("${assets.currentCourseFallback}")`,
                          }}
                        />
                        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white px-2 py-1 text-[8px] font-semibold text-[#ff5e2f]">
                            {progress}% Completed
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-[8px] font-semibold text-black/72">
                            {course._count.chapters} Modules
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 flex flex-col flex-1">
                        <h2 className="max-w-[18rem] text-[clamp(1.1rem,1.5vw,1.25rem)] font-medium leading-[1.08] text-black">
                          {course.title}
                        </h2>
                        <p className="mt-1 text-[11px] text-[#8b8888]">
                          by {course.teachers?.[0]?.name ?? "Expert Mentors"}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-[#4caf50]">
                          {completedCount} / {lessonCount} lessons completed
                          {course._count.tests > 0 ? ` • ${course._count.tests} tests` : ""}
                        </p>

                        <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#4caf50,#38c1ff)]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          <Link
                            className={workspaceButtonStyles({
                              className: "h-[34px] px-4 text-[13px] shrink-0",
                            })}
                            href={`/dashboard/courses/${course.slug}`}
                          >
                            Continue
                          </Link>
                        </div>
                      </div>
                    </article>
                  </AnimCard>
                );
              })}
            </div>
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
                    <span className="text-[17px] font-semibold">{item.label}</span>
                  </Link>
                </AnimCard>
              ))}
            </div>
          </RevealSection>
        </div>
      )}

      <RevealSection delay={0.1}>
        <CatalogWithFilter bundles={bundles} courses={courses} userId={userId || ""} />
      </RevealSection>
    </div>
  );
}
