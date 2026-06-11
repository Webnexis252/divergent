import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnrollmentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { cx } from "@/lib/cx";
import { getPageAuth } from "@/lib/page-auth";
import { logger } from "@/lib/logger";
import {
  AnimCard,
  FloatPulse,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "../../_components/motion-wrappers";
import { BundleCheckoutButton } from "@/app/(public)/bundles/[slug]/_components/BundleCheckoutButton";
import { 
  LayoutDashboard, 
  BookOpen, 
  Video, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Calendar,
  Award,
  Star,
  CheckCircle2,
  Clock,
  Globe,
  BarChart3,
  Zap,
  GraduationCap,
  MessageCircle,
  Quote,
  ChevronRight,
  Play,
  Shield,
  Package
} from "lucide-react";

export const dynamic = "force-dynamic";

type BundleDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const assets = {
  heroIllustration: "/assets/789e932c2f45a3aedd7967edba282c943ce97d1d.png",
  fallbackThumbnail: "https://api.dicebear.com/9.x/shapes/svg?seed=cf170519-6960-44d6-913f-b1df537a439e",
  mentorAvatar: "https://api.dicebear.com/9.x/shapes/svg?seed=1fdd695f-0eb2-4964-b9f7-d3b9472b043a",
  liveClassFeature: "/assets/7ac54c6ed7ca5712e26b75ff032783a11d45b059.png",
  doubtSolvingFeature: "/assets/18a626f90edd50604a508b3ec1fe4225d0168d5c.png",
  mockTestsFeature: "/assets/9e1f32ff326eef587374d218ae9b0ed57b8fa746.png",
  communityFeature: "/assets/5ac4864e3e17823f677212d8c1268bdffcbfe02d.png",
  certificateFeature: "/assets/0eb8388fb7d03e1be4aacdf8c01dfcc329307443.png",
} as const;

import { studentNavItems } from "../../_components/nav-items";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";

function formatPrice(price: number) {
  return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free";
}

function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k+`;
  }
  return `${Math.max(value, 1)}`;
}

function pluralize(value: number, word: string) {
  return `${value} ${word}${value === 1 ? "" : "s"}`;
}

async function getBundleEnrollment(userId: string, bundleId: string) {
  return await prisma.enrollment.findFirst({
    where: {
      userId,
      bundleId,
    },
    select: {
      id: true,
      status: true,
    },
  });
}

export default async function BundleDetailPage({ params }: BundleDetailPageProps) {
  const auth = await getPageAuth();
  const { slug } = await params;

  if (!auth) {
    redirect(`/login?callbackUrl=/dashboard/bundles/${slug}`);
  }

  const bundleResult = await prisma.bundle.findUnique({
    where: { slug },
    include: {
      courses: {
        include: {
          teachers: { select: { id: true, name: true, image: true } },
          course: {
            select: {
              id: true,
              title: true,
              slug: true,
              subtitle: true,
              courseRating: true,
              features: true,
              courseLevel: true,
              language: true,
              totalHours: true,
              learningOutcomes: true,
              teachers: { select: { id: true, name: true, image: true } },
              liveClasses: {
                orderBy: { startTime: "asc" },
                select: { id: true, title: true, startTime: true, recordingUrl: true },
              },
              assignments: { select: { id: true } },
              tests: { where: { status: "PUBLISHED" }, select: { id: true } },
              chapters: {
                where: { isPublished: true },
                orderBy: { order: "asc" },
                select: {
                  id: true,
                  title: true,
                  order: true,
                  lessons: {
                    where: { isPublished: true },
                    orderBy: { order: "asc" },
                    select: {
                      id: true,
                      title: true,
                      durationMins: true,
                      isFreePreview: true,
                    },
                  },
                },
              },
            }
          }
        }
      },
      _count: { select: { enrollments: true } }
    }
  }).catch((err: unknown) => {
    logger.error("BundleDetailPage: failed to load bundle from DB", err instanceof Error ? err : new Error(String(err)), { slug });
    throw err;
  });

  if (!bundleResult || !bundleResult.isPublished) {
    notFound();
  }

  const bundle = bundleResult;
  const enrollment = await getBundleEnrollment(auth.userId, bundle.id).catch(() => null);

  const isEnrolled = enrollment
      ? enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED ||
        enrollment.status === EnrollmentStatus.PAUSED
      : false;

  // Aggregate stats
  const allTeachers: any[] = [];
  const seenTeacherIds = new Set();
  let totalLessons = 0;
  let totalDuration = 0;
  let liveClassCount = 0;
  let assignmentCount = 0;
  let testCount = 0;
  let previewCount = 0;
  let totalChapters = 0;
  
  const allCourseLessonIds: string[] = [];

  bundle.courses.forEach(bc => {
    const course = bc.course;
    
    liveClassCount += course.liveClasses.length;
    assignmentCount += course.assignments.length;
    testCount += course.tests.length;
    totalChapters += course.chapters.length;

    course.chapters.forEach(ch => {
      totalLessons += ch.lessons.length;
      ch.lessons.forEach(l => {
        allCourseLessonIds.push(l.id);
        totalDuration += l.durationMins;
        if (l.isFreePreview) previewCount++;
      });
    });

    const teachersList = bc.teachers.length > 0 ? bc.teachers : course.teachers;
    teachersList.forEach(t => {
      if (!seenTeacherIds.has(t.id || t.name)) {
        seenTeacherIds.add(t.id || t.name);
        allTeachers.push(t);
      }
    });
  });

  let completedLessonCount = 0;
  const completedLessonIds: Set<string> = new Set();
  if (isEnrolled && allCourseLessonIds.length > 0) {
    const rows = await prisma.lessonProgress.findMany({
      where: {
        userId: auth.userId,
        isCompleted: true,
        lessonId: { in: allCourseLessonIds },
      },
      select: { lessonId: true },
    }).catch(() => []);
    completedLessonCount = rows.length;
    rows.forEach((r) => completedLessonIds.add(r.lessonId));
  }

  const progressPercent =
    isEnrolled && totalLessons > 0
      ? Math.round((completedLessonCount / totalLessons) * 100)
      : 0;

  const teacherName = allTeachers?.[0]?.name ?? "Expert Mentors";
  const bundleHours = totalDuration > 0 ? Math.max(1, Math.round(totalDuration / 60)) : 0;
  const durationStr = bundleHours > 0 ? pluralize(bundleHours, "hour") : pluralize(totalChapters, "module");
  
  const overviewItems = [
    `Duration: ${durationStr}`,
    `Includes: ${pluralize(bundle.courses.length, "course")}`,
    liveClassCount > 0 ? "Format: Live + Recorded" : "Format: Recorded + Self-paced",
  ];

  const mentorCards = allTeachers.slice(0, 2).map((mentor, idx) => ({
    name: mentor.name,
    subtitle: idx === 0 ? "Lead mentor" : "Mentor",
    body: idx === 0 
      ? `Guides the overall learning pathway and helps students master the curriculum.`
      : "Adds critique, feedback, and practice review so learners stay consistent.",
    image: mentor.image || assets.mentorAvatar,
  }));
  
  if (mentorCards.length === 0) {
    mentorCards.push({
      name: "Mentor Support Team",
      subtitle: `Doubt support & guidance`,
      body: "Adds critique, feedback, and practice review so learners stay consistent across every module.",
      image: assets.mentorAvatar,
    });
  }

  const learningItems = [
    `Access ${pluralize(bundle.courses.length, "complete course")} in one combined bundle.`,
    totalChapters > 0 ? `Move through ${pluralize(totalChapters, "structured module")} that build skill progressively.` : "Work through a structured path.",
    totalLessons > 0 ? `Learn across ${pluralize(totalLessons, "guided lesson")} with clear progression.` : "Learn through guided lessons.",
    liveClassCount > 0 ? `Join ${pluralize(liveClassCount, "live class")} for deeper walkthroughs and critique.` : "Catch live support sessions whenever scheduled.",
    testCount > 0 ? `Practice with ${pluralize(testCount, "test")} built into the learning flow.` : "Practice with checkpoints.",
    assignmentCount > 0 ? `Reinforce concepts through ${pluralize(assignmentCount, "assignment")}.` : "Reinforce concepts through applied work.",
    "Return to recordings, resources, and practice blocks at your own pace."
  ];

  const featureTiles = [
    {
      label: "Live Classes",
      image: assets.liveClassFeature,
      href: "/dashboard/live-classes",
    },
    {
      label: "Doubt solving",
      image: assets.doubtSolvingFeature,
      href: "/dashboard/doubts",
    },
    {
      label: "Mock tests",
      image: assets.mockTestsFeature,
      href: `/dashboard/tests`,
    },
    {
      label: "Community",
      image: assets.communityFeature,
      href: "/dashboard/community",
    },
    {
      label: "Certificate",
      image: assets.certificateFeature,
      href: "/dashboard/certificates",
    },
  ];

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">
        <div className="mx-auto max-w-[1920px] px-3 pb-14 pt-4 sm:px-6 sm:pt-6 xl:px-0 xl:pb-24">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <DashboardSidebar />

            <section className="relative px-0 sm:px-4 xl:pr-10">
              <div className="mx-auto max-w-[1368px]">
                <RevealSection>
                  <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#38c1ff_0%,#2db4f0_40%,#45caff_100%)] px-6 pb-12 pt-10 sm:px-10 lg:px-14 xl:min-h-[436px] xl:px-[70px] xl:pb-20 xl:pt-[52px]">
                    <div className="pointer-events-none absolute right-[170px] top-0 h-[34px] w-[220px] rounded-b-[25px] bg-white/15" />
                    <div className="pointer-events-none absolute right-[116px] top-0 h-[93px] w-[117px] rounded-bl-[20px] rounded-tr-[40px] bg-white/12" />
                    <div className="pointer-events-none absolute bottom-[112px] right-[116px] h-[43px] w-[220px] rounded-b-[25px] bg-white/10" />
                    <div className="pointer-events-none absolute -left-20 -top-20 h-[200px] w-[200px] rounded-full bg-white/[0.06] blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-10 right-[30%] h-[160px] w-[160px] rounded-full bg-white/[0.05] blur-3xl" />
                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-center">
                      <div className="space-y-5 pt-2 text-white">
                        <div className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[12px] font-bold text-white tracking-wider uppercase backdrop-blur-md">
                          Bundle
                        </div>
                        <h1 className="max-w-[18ch] text-[clamp(2.2rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.01em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
                          {bundle.title}
                        </h1>
                        <p className="max-w-[42rem] text-[clamp(1.15rem,2vw,1.4rem)] font-medium leading-[1.5] text-white/90">
                          {bundle.description || "Get access to multiple courses in one comprehensive bundle."}
                        </p>
                      </div>

                      <FloatPulse className="mx-auto xl:mx-0 xl:justify-self-end">
                        <div className="relative flex items-center justify-center">
                          <div className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.06] blur-3xl" />
                          <div className="relative h-[250px] w-[250px] overflow-hidden rounded-[20px] shadow-2xl xl:h-[300px] xl:w-[300px] border-[4px] border-white/20">
                             <div
                              aria-hidden="true"
                              className="h-full w-full bg-cover bg-center"
                              style={{
                                backgroundImage: bundle.thumbnail
                                  ? `url("${bundle.thumbnail}")`
                                  : `linear-gradient(135deg, #bae6fd, #38c1ff)`,
                              }}
                            />
                          </div>
                        </div>
                      </FloatPulse>
                    </div>

                    <div className="relative z-10 mt-10 xl:mt-[86px]">
                      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)] xl:max-w-[calc(100%-423px)] 2xl:max-w-[877px]">
                        <div className="grid gap-5 sm:grid-cols-[153px_minmax(0,1fr)]">
                          <div className="flex min-h-[148px] flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#38c1ff_0%,#0ea5e9_100%)] px-6 py-7 text-center text-white">
                            <div className="relative rounded-full rounded-bl-sm border border-white/40 bg-white/10 p-2.5 backdrop-blur-sm">
                              <Package className="h-6 w-6 text-white drop-shadow-sm" />
                            </div>
                            <p className="text-[20px] font-bold tracking-wide">Bundle</p>
                          </div>

                          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_1px_88px_1px_120px] sm:items-center sm:px-8 sm:py-0">
                            <p className="text-[15px] leading-7 text-[#888] sm:max-w-[241px]">
                              Unlock {bundle.courses.length} courses together in one package.
                            </p>

                            <div className="hidden justify-center sm:flex">
                              <div className="h-[90px] w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
                            </div>

                            <div className="flex flex-col items-center gap-2 text-center text-black">
                              <Users className="h-8 w-8 text-[#38c1ff]/70" />
                              <p className="text-[13px] font-semibold tabular-nums">{formatCompactCount(bundle._count.enrollments)}</p>
                              <p className="text-[15px] font-bold">Learners</p>
                            </div>

                            <div className="hidden justify-center sm:flex">
                              <div className="h-[90px] w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
                            </div>

                            <div className="flex flex-col items-center justify-center">
                              {isEnrolled ? (
                                <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-[14px] font-bold text-green-700 border border-green-200">
                                  <CheckCircle2 className="h-5 w-5" /> Enrolled
                                </span>
                              ) : (
                                <BundleCheckoutButton 
                                  bundleId={bundle.id} 
                                  userId={auth.userId} 
                                  className="!rounded-full px-6 py-2 h-auto text-[14px] shadow-[0_4px_12px_rgba(56,193,255,0.28)]"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </RevealSection>

                <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,876px)_391px] xl:items-start">
                  <div className="space-y-8">
                    <RevealSection delay={0.05}>
                      <section className="rounded-[18px] bg-white px-6 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] sm:px-10 xl:px-11 xl:py-[42px]">
                        <div id="what-youll-learn" className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                              <Zap className="h-[18px] w-[18px] text-[#38c1ff]" />
                            </div>
                            <h2 className="text-[24px] font-bold text-black">What you&rsquo;ll get</h2>
                          </div>
                          <ul className="grid gap-3 sm:grid-cols-2">
                            {learningItems.map((item) => (
                              <li key={item} className="flex items-start gap-3 rounded-[12px] bg-[#f7fdf9] px-4 py-3">
                                <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#4caf50]" />
                                <span className="text-[14.5px] leading-[1.6] text-[#444]">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </RevealSection>

                    <div className="grid gap-6 xl:grid-cols-[407px_minmax(0,1fr)] xl:items-start">
                      <RevealSection delay={0.08}>
                        <section className="rounded-[18px] bg-white px-7 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] xl:min-h-[247px]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                              <BookOpen className="h-[18px] w-[18px] text-[#38c1ff]" />
                            </div>
                            <h2 className="text-[24px] font-bold text-black">Bundle Overview</h2>
                          </div>
                          <div className="mt-8 grid gap-3">
                            {overviewItems.map((item, idx) => {
                              const icons = [Clock, BookOpen, Globe, Play];
                              const Icon = icons[idx] || Clock;
                              return (
                                <div key={item} className="flex items-center gap-3 rounded-[10px] bg-[#f8f9fa] px-4 py-3">
                                  <Icon className="h-[16px] w-[16px] shrink-0 text-[#38c1ff]" />
                                  <span className="text-[15px] text-[#555]">{item}</span>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      </RevealSection>

                      <StaggerGrid className="grid gap-4 sm:grid-cols-2">
                        {mentorCards.map((mentor) => (
                          <AnimCard key={mentor.name}>
                            <section className="group relative overflow-hidden rounded-[18px] bg-white px-4 py-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.09)] xl:min-h-[247px]">
                              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#38c1ff,#ffc107)]" />
                              <div className="mx-auto h-[82px] w-[82px] overflow-hidden rounded-full bg-[#f0f0f0] ring-3 ring-[#38c1ff]/10 ring-offset-2">
                                <div
                                  aria-hidden="true"
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${mentor.image}")` }}
                                />
                              </div>
                              <div className="mt-4 space-y-1">
                                <p className="text-[16px] font-semibold text-black">{mentor.name}</p>
                                <p className="text-[12px] font-medium text-[#38c1ff]">{mentor.subtitle}</p>
                              </div>
                              <p className="mt-4 text-[12px] leading-[1.7] text-[#666]">{mentor.body}</p>
                            </section>
                          </AnimCard>
                        ))}
                      </StaggerGrid>
                    </div>

                    <RevealSection delay={0.1}>
                      <section className="rounded-[18px] bg-white px-6 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] sm:px-10 xl:px-[38px] xl:py-10">
                        <div id="curriculum" className="space-y-8">
                          {/* Curriculum header */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                                <ClipboardList className="h-[18px] w-[18px] text-[#38c1ff]" />
                              </div>
                              <h2 className="text-[24px] font-bold text-black">Combined Curriculum</h2>
                            </div>
                            {isEnrolled && totalLessons > 0 && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[13px] font-medium text-[#4caf50]">
                                <CheckCircle2 className="h-4 w-4" />
                                {completedLessonCount} / {totalLessons} completed ({progressPercent}%)
                              </span>
                            )}
                          </div>

                          {bundle.courses.length > 0 ? (
                            <div className="space-y-12">
                              {bundle.courses.map((bc) => {
                                const singleCourse = bc.course;
                                if (singleCourse.chapters.length === 0) return null;

                                return (
                                  <div key={singleCourse.id} className="space-y-5">
                                    <h3 className="text-[20px] font-bold text-black flex items-center gap-2 border-b-2 border-blue-500 pb-2">
                                      <BookOpen className="h-5 w-5 text-blue-500" />
                                      {singleCourse.title}
                                    </h3>
                                    
                                    <div className="space-y-5">
                                      {singleCourse.chapters.map((chapter, index) => {
                                        const chapterCompletedCount = isEnrolled
                                          ? chapter.lessons.filter((l) => completedLessonIds.has(l.id)).length
                                          : 0;
                                        const chapterTotal = chapter.lessons.length;
                                        const chapterPercent =
                                          isEnrolled && chapterTotal > 0
                                            ? Math.round((chapterCompletedCount / chapterTotal) * 100)
                                            : 0;

                                        return (
                                          <div key={chapter.id} className="space-y-3 pl-2 sm:pl-4 border-l-2 border-gray-100">
                                            {/* Chapter header */}
                                            <div className="flex items-center justify-between gap-3">
                                              <p className="text-[17px] font-semibold text-black">
                                                <span className="mr-2 text-[#38c1ff]">Module {index + 1}:</span>
                                                {chapter.title}
                                              </p>
                                              {isEnrolled && chapterTotal > 0 && (
                                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-medium text-[#777]">
                                                  {chapterCompletedCount}/{chapterTotal}
                                                </span>
                                              )}
                                            </div>

                                            {/* Chapter progress bar */}
                                            {isEnrolled && chapterTotal > 0 && (
                                              <div className="h-1 w-full overflow-hidden rounded-full bg-black/6">
                                                <div
                                                  className="h-full rounded-full bg-[linear-gradient(90deg,#4caf50,#38c1ff)] transition-all duration-500"
                                                  style={{ width: `${chapterPercent}%` }}
                                                />
                                              </div>
                                            )}

                                            {/* Lesson rows */}
                                            {chapterTotal > 0 ? (
                                              <div className="space-y-1.5 pt-1">
                                                {chapter.lessons.map((lesson, li) => {
                                                  const done = isEnrolled && completedLessonIds.has(lesson.id);
                                                  return (
                                                    <div
                                                      key={lesson.id}
                                                      className={`flex min-h-[44px] items-center justify-between gap-3 rounded-[10px] border px-[13px] py-[11px] text-[14px] transition-colors ${
                                                        done
                                                          ? "border-green-200 bg-green-50/60 text-green-800"
                                                          : "border-[#e9e9e9] bg-white text-black hover:border-blue-200"
                                                      }`}
                                                    >
                                                      <div className="flex items-center gap-2.5 min-w-0">
                                                        <span className={`shrink-0 text-[11px] font-semibold w-5 text-right ${done ? "text-green-500" : "text-[#bbb]"}`}>
                                                          {li + 1}
                                                        </span>
                                                        {isEnrolled ? (
                                                          <Link href={`/dashboard/courses/${singleCourse.slug}/lessons/${lesson.id}`} className="truncate hover:text-[#38c1ff] transition-colors">
                                                            {lesson.title}
                                                          </Link>
                                                        ) : (
                                                          <span className="truncate">{lesson.title}</span>
                                                        )}
                                                      </div>
                                                      <div className="flex shrink-0 items-center gap-2">
                                                        {lesson.durationMins > 0 && (
                                                          <span className="text-[11px] text-[#bbb]">
                                                            {lesson.durationMins}m
                                                          </span>
                                                        )}
                                                        {lesson.isFreePreview && (
                                                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">
                                                            Preview
                                                          </span>
                                                        )}
                                                        {done ? (
                                                          <span className="text-green-500 text-[16px]" aria-label="Completed">✓</span>
                                                        ) : (
                                                          <span className="h-4 w-4 rounded-full border-2 border-[#ddd]" aria-hidden />
                                                        )}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="flex min-h-[44px] items-center rounded-[10px] border border-[#e9e9e9] px-[13px] py-[11px] text-[15px] text-[#8b8888]">
                                                Lessons will appear here soon.
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-[10px] border border-dashed border-[#e9e9e9] px-5 py-10 text-[15px] text-[#8b8888]">
                              Curriculum will appear here as soon as courses are added to this bundle.
                            </div>
                          )}
                        </div>
                      </section>
                    </RevealSection>

                    <RevealSection delay={0.12}>
                      <section className="rounded-[18px] bg-white px-6 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] sm:px-10 xl:px-[103px] xl:py-[43px]">
                        <div className="space-y-9">
                          <div className="flex items-center justify-center gap-3">
                            <h2 className="text-[26px] font-bold text-black">What&apos;s included</h2>
                          </div>

                          <div className="space-y-5">
                            <StaggerGrid className="grid gap-5 md:grid-cols-3">
                              {featureTiles.slice(0, 3).map((feature) => (
                                <AnimCard key={feature.label} className="h-full">
                                  <Link
                                    className="flex h-full w-full flex-col items-center justify-center gap-[10px] rounded-[20px] bg-[#71d3ff] px-4 py-5 text-center text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] hover:-translate-y-1 transition-transform duration-300"
                                    href={feature.href}
                                  >
                                    <div className="flex h-[100px] items-center justify-center">
                                      <Image
                                        alt={feature.label}
                                        className="max-h-full w-auto object-contain drop-shadow-2xl"
                                        height={140}
                                        src={feature.image}
                                        width={140}
                                      />
                                    </div>
                                    <span className="font-semibold">{feature.label}</span>
                                  </Link>
                                </AnimCard>
                              ))}
                            </StaggerGrid>

                            <StaggerGrid className="grid gap-5 md:grid-cols-2">
                              {featureTiles.slice(3).map((feature) => (
                                <AnimCard key={feature.label} className="h-full">
                                  <Link
                                    className="flex h-full w-full flex-col items-center justify-center gap-[10px] rounded-[20px] border border-[#e8f5fb] bg-[#fdfdfd] px-4 py-5 text-center shadow-[0_4px_10px_rgba(0,0,0,0.03)] hover:-translate-y-1 transition-transform duration-300"
                                    href={feature.href}
                                  >
                                    <div className="flex h-[100px] items-center justify-center">
                                      <Image
                                        alt={feature.label}
                                        className="max-h-full w-auto object-contain mix-blend-multiply"
                                        height={140}
                                        src={feature.image}
                                        width={140}
                                      />
                                    </div>
                                    <span className="font-semibold text-[#555]">{feature.label}</span>
                                  </Link>
                                </AnimCard>
                              ))}
                            </StaggerGrid>
                          </div>
                        </div>
                      </section>
                    </RevealSection>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
