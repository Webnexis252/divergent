import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EnrollmentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { brand } from "@/lib/brand";
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
import { EnrollButton } from "./_components/enroll-button";
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
  Shield
} from "lucide-react";

export const dynamic = "force-dynamic";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const assets = {
  heroIllustration: "/assets/789e932c2f45a3aedd7967edba282c943ce97d1d.png",
  premiumBadge: "https://api.dicebear.com/9.x/shapes/svg?seed=d69210fb-fac4-4a3f-ae58-7426f89af020",
  learnersIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=8bba02c3-8180-4d46-b5cd-f071d8a40f43",
  ratings: "https://api.dicebear.com/9.x/shapes/svg?seed=58f66a79-9fb4-4b1a-a7cb-df0e2291a488",
  divider: "https://api.dicebear.com/9.x/shapes/svg?seed=0c1d4445-8c2f-4539-95cc-a8cb555bb081",
  fallbackThumbnail: "https://api.dicebear.com/9.x/shapes/svg?seed=cf170519-6960-44d6-913f-b1df537a439e",
  mentorAvatar: "https://api.dicebear.com/9.x/shapes/svg?seed=1fdd695f-0eb2-4964-b9f7-d3b9472b043a",
  buyNowIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=302f0b9c-5f11-4d9d-ab89-dfad0999d3f4",
  emiIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=104750b5-4aac-439b-a0d7-04c01181c5da",
  liveClassFeature: "/assets/7ac54c6ed7ca5712e26b75ff032783a11d45b059.png",
  doubtSolvingFeature: "/assets/18a626f90edd50604a508b3ec1fe4225d0168d5c.png",
  mockTestsFeature: "/assets/9e1f32ff326eef587374d218ae9b0ed57b8fa746.png",
  communityFeature: "/assets/5ac4864e3e17823f677212d8c1268bdffcbfe02d.png",
  certificateFeature: "/assets/0eb8388fb7d03e1be4aacdf8c01dfcc329307443.png",
  testsTile: "/assets/dashboard/explore-tests.png",
  modulesTile: "/assets/dashboard/explore-modules.png",
  dashboardIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=cf63ebaf-2c2d-461d-b303-52e41d36c645",
  coursesIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=f5a0a60c-baa8-428d-b6e0-24fe7150e184",
  liveClassesIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=95f74062-c186-4036-9109-4876860c1840",
  communityIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=2adf51c8-f658-4f1e-84e4-26a5345706d5",
  assignmentsIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=ffea850b-8a37-4bd9-9bcf-92f2122bf9d0",
  progressIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=4c09dd54-76f0-47cb-81bd-6df94c0bdcf9",
  calendarIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=e233071f-ae5b-440b-b6a5-2a067b4e2248",
} as const;

import { studentNavItems } from "../../_components/nav-items";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";

const sidebarItems = studentNavItems.map(item => ({
  ...item,
  active: item.href === "/dashboard/courses"
}));

function formatPrice(price: number) {
  return price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free";
}

function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k+`;
  }

  return `${Math.max(value, 1)}`;
}

function formatAudienceLabel(value: number) {
  return `${formatCompactCount(value)} students`;
}

function pluralize(value: number, word: string) {
  return `${value} ${word}${value === 1 ? "" : "s"}`;
}

function countLessons(
  chapters: Array<{
    lessons: Array<{ durationMins: number }>;
  }>,
) {
  return chapters.reduce((sum, chapter) => sum + chapter.lessons.length, 0);
}

function countDuration(
  chapters: Array<{
    lessons: Array<{ durationMins: number }>;
  }>,
) {
  return chapters.reduce(
    (sum, chapter) =>
      sum +
      chapter.lessons.reduce((lessonSum, lesson) => lessonSum + lesson.durationMins, 0),
    0,
  );
}

function buildLearningItems({
  title,
  chapterCount,
  lessonCount,
  liveClassCount,
  assignmentCount,
  testCount,
  previewCount,
}: {
  title: string;
  chapterCount: number;
  lessonCount: number;
  liveClassCount: number;
  assignmentCount: number;
  testCount: number;
  previewCount: number;
}) {
  return [
    `Build a confident foundation around ${title}.`,
    chapterCount > 0
      ? `Move through ${pluralize(chapterCount, "structured module")} that build skill progressively.`
      : "Work through a structured path that builds skill progressively.",
    lessonCount > 0
      ? `Learn across ${pluralize(lessonCount, "guided lesson")} with clear progression.`
      : "Learn through guided lessons with a clear progression.",
    liveClassCount > 0
      ? `Join ${pluralize(liveClassCount, "live class")} for deeper walkthroughs and critique.`
      : "Catch live support sessions whenever new classes are scheduled.",
    testCount > 0
      ? `Practice with ${pluralize(testCount, "course test")} built into the learning flow.`
      : "Practice with checkpoints that reinforce the core concepts.",
    assignmentCount > 0
      ? `Reinforce concepts through ${pluralize(assignmentCount, "assignment")} and applied work.`
      : "Reinforce concepts through applied work and structured exercises.",
    previewCount > 0
      ? `Preview ${pluralize(previewCount, "lesson")} before committing to the full course.`
      : "Explore the curriculum before diving into the full program.",
    "Improve your problem-solving, visual reasoning, and presentation confidence.",
    "Return to recordings, resources, and practice blocks at your own pace.",
  ];
}

async function getCourseEnrollment(userId: string, courseId: string) {
  try {
    return await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        bundleId: true,
      },
    });
  } catch {
    return prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        status: true,
        progressPercent: true,
        bundleId: true,
      },
    });
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  // Allow any authenticated user to view course detail pages (students, teachers, admins)
  // Role-specific restrictions (e.g. enrolled-only content) are handled below per-section
  const auth = await getPageAuth();
  const { slug } = await params;

  // Unauthenticated users are redirected to login
  if (!auth) {
    redirect(`/login?callbackUrl=/dashboard/courses/${slug}`);
  }

  // Wrap DB fetch in try/catch so transient errors hit the error boundary
  // instead of crashing with an opaque 500. TypeScript infers the full
  // select type from the query — do NOT widen the variable type.
  const courseResult = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      subtitle: true,
      description: true,
      overviewContent: true,
      thumbnail: true,
      price: true,
      originalPrice: true,
      emiPlans: true,
      isPublished: true,
      totalHours: true,
      lessonCount: true,
      courseRating: true,
      learningOutcomes: true,
      features: true,
      testimonials: true,
      faqs: true,
      category: true,
      courseLevel: true,
      language: true,
      teachers: {
        select: {
          name: true,
          image: true,
        },
      },
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
      liveClasses: {
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          title: true,
          startTime: true,
          recordingUrl: true,
        },
      },
      assignments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
        },
      },
      tests: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
        },
      },
      _count: {
        select: {
          chapters: true,
          enrollments: true,
        },
      },
    },
  }).catch((err: unknown) => {
    logger.error("CourseDetailPage: failed to load course from DB", err instanceof Error ? err : new Error(String(err)), { slug });
    throw err; // re-throw so Next.js error boundary renders error.tsx
  });

  if (!courseResult || !courseResult.isPublished) {
    notFound();
  }

  // After notFound() the type is narrowed — course is guaranteed non-null.
  const course = courseResult;

  const enrollment = await getCourseEnrollment(auth.userId, course.id).catch(() => null);

  const isEnrolled =
    enrollment && "status" in enrollment
      ? enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED ||
        enrollment.status === EnrollmentStatus.PAUSED
      : false; // Never treat an enrollment without a known ACTIVE status as enrolled

  // Fetch real completed lesson count from LessonProgress
  const allCourseLessonIds = course.chapters.flatMap((ch) => ch.lessons.map((l) => l.id));
  let completedLessonCount = 0;
  if (isEnrolled && allCourseLessonIds.length > 0) {
    completedLessonCount = await prisma.lessonProgress.count({
      where: {
        userId: auth.userId,
        isCompleted: true,
        lessonId: { in: allCourseLessonIds },
      },
    }).catch(() => 0);
  }

  // Build a set of completed lesson IDs for per-lesson indicators in the curriculum
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
    rows.forEach((r) => completedLessonIds.add(r.lessonId));
  }

  let displayTeachers = course.teachers;
  if (enrollment && 'bundleId' in enrollment && enrollment.bundleId) {
    const override = await prisma.bundleCourse.findFirst({
      where: { bundleId: enrollment.bundleId, courseId: course.id },
      include: { teachers: { select: { name: true, image: true } } }
    });
    if (override?.teachers && override.teachers.length > 0) {
      displayTeachers = override.teachers;
    }
  }

  const teacherName = displayTeachers?.[0]?.name ?? "Expert Mentors";
  const totalLessons = countLessons(course.chapters);
  const totalDuration = countDuration(course.chapters);
  const previewCount = course.chapters.reduce(
    (sum, chapter) => sum + chapter.lessons.filter((lesson) => lesson.isFreePreview).length,
    0,
  );
  const firstLesson = course.chapters.find((chapter) => chapter.lessons.length > 0)?.lessons[0] ?? null;
  const nextLiveClass = course.liveClasses.find((item) => !item.recordingUrl) ?? course.liveClasses[0] ?? null;
  const originalPrice =
    course.originalPrice !== null && course.originalPrice > 0
      ? course.originalPrice
      : course.price > 0
        ? Math.max(Math.round(course.price / 0.56), Math.round(course.price))
        : 0;
  const discountPercent =
    course.price > 0 && originalPrice > course.price
      ? Math.max(1, Math.round((1 - course.price / originalPrice) * 100))
      : 0;
  const emiPlans = Array.isArray(course.emiPlans) && (course.emiPlans as Array<{ label: string; amount: number; dueDays: number }>).length > 0
    ? (course.emiPlans as Array<{ label: string; amount: number; dueDays: number }>)
    : null;
  const courseHours = totalDuration > 0 ? Math.max(1, Math.round(totalDuration / 60)) : 0;
  const learningItems = Array.isArray(course.learningOutcomes) && course.learningOutcomes.length > 0
    ? (course.learningOutcomes as string[])
    : buildLearningItems({
        title: course.title,
        chapterCount: course.chapters.length,
        lessonCount: totalLessons,
        liveClassCount: course.liveClasses.length,
        assignmentCount: course.assignments.length,
        testCount: course.tests.length,
        previewCount,
      });

  const durationStr = course.totalHours ? `${course.totalHours} hours` : (courseHours > 0 ? pluralize(courseHours, "hour") : pluralize(course.chapters.length, "module"));
  const overviewItems = [
    `Duration: ${durationStr}`,
    `Level: ${course.courseLevel || "Beginner to Advanced"}`,
    `Language: ${course.language || "English"}`,
    course.liveClasses.length > 0 ? "Format: Live + Recorded" : "Format: Recorded + Self-paced",
  ];
  const mentorCards = [
    {
      name: teacherName,
      subtitle: "Lead mentor",
      body:
        totalLessons > 0
          ? `Guides the ${pluralize(totalLessons, "lesson")} pathway and helps students turn concepts into confident outputs.`
          : "Guides the learning path and helps students turn concepts into confident outputs.",
      image: displayTeachers?.[0]?.image ?? assets.mentorAvatar,
    },
    {
      name: "Mentor Support Team",
      subtitle: `${pluralize(course.liveClasses.length, "live session")} + doubt support`,
      body:
        "Adds critique, feedback, and practice review so learners stay consistent across every module.",
      image: assets.mentorAvatar,
    },
  ];
  const featureTiles = Array.isArray(course.features) && course.features.length > 0
    ? (course.features as Array<{ title: string; icon?: string }>).map(f => ({ label: f.title, image: f.icon || assets.liveClassFeature, href: "#" }))
    : [
    {
      label: "Live Class",
      image: assets.liveClassFeature,
      href: nextLiveClass ? `/dashboard/live-classes/${nextLiveClass.id}` : "/dashboard/live-classes",
    },
    {
      label: "Doubt solving",
      image: assets.doubtSolvingFeature,
      href: "/dashboard/doubts",
    },
    {
      label: "Mock tests",
      image: assets.mockTestsFeature,
      href: `/dashboard/courses/${course.slug}/tests`,
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
  const testimonialCards = Array.isArray(course.testimonials) && course.testimonials.length > 0
    ? (course.testimonials as Array<{ text: string; name: string; rating?: number }>).map(t => ({ quote: t.text, author: t.name, rating: t.rating }))
    : [
    {
      quote: "This course helped me understand exactly what UCEED expects.",
      author: "Aarav Singh",
      rating: 5,
    },
    {
      quote: "The mix of live support and structured practice made revision much easier.",
      author: "Aarav Singh",
      rating: 5,
    },
  ];
  const faqItems = Array.isArray(course.faqs) && course.faqs.length > 0
    ? (course.faqs as Array<{ question: string; answer: string }>)
    : [
    {
      question: "Is this course beginner-friendly?",
      answer:
        course.chapters.length > 0
          ? `Yes. The course starts with ${course.chapters[0].title} and builds up module by module.`
          : "Yes. The course is structured to guide beginners from fundamentals into more advanced practice.",
    },
    {
      question: "Do I get tests and assignments with this course?",
      answer:
        course.tests.length > 0 || course.assignments.length > 0
          ? `Yes. You get ${pluralize(course.tests.length, "test")} and ${pluralize(course.assignments.length, "assignment")} across the course flow.`
          : "Yes. Practice checkpoints and guided coursework are included whenever they are published for this course.",
    },
    {
      question: "Are live classes included after enrollment?",
      answer:
        course.liveClasses.length > 0
          ? `Yes. ${pluralize(course.liveClasses.length, "live class")} are already scheduled or available through the dashboard.`
          : "Live classes appear in your dashboard whenever new sessions are scheduled for the course.",
    },
    {
      question: "How do I continue once I enroll?",
      answer:
        firstLesson
          ? "After enrollment, you can jump straight into the first lesson from this page or continue through the curriculum section below."
          : "After enrollment, the course becomes part of your student dashboard so you can continue from the curriculum section whenever lessons are published.",
    },
  ];
  // Real progress from LessonProgress table (not the stale progressPercent estimate)
  const progressPercent =
    isEnrolled && totalLessons > 0
      ? Math.round((completedLessonCount / totalLessons) * 100)
      : Math.max(0, Math.min(100, Math.round(enrollment?.progressPercent ?? 0)));
  const primaryActionHref = firstLesson
    ? `/dashboard/courses/${course.slug}/lessons/${firstLesson.id}`
    : nextLiveClass
      ? `/dashboard/live-classes/${nextLiveClass.id}`
      : course.liveClasses.length > 0
        ? "/dashboard/live-classes"
        : "#curriculum";

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
                    {/* Decorative shapes */}
                    <div className="pointer-events-none absolute right-[170px] top-0 h-[34px] w-[220px] rounded-b-[25px] bg-white/15" />
                    <div className="pointer-events-none absolute right-[116px] top-0 h-[93px] w-[117px] rounded-bl-[20px] rounded-tr-[40px] bg-white/12" />
                    <div className="pointer-events-none absolute bottom-[112px] right-[116px] h-[43px] w-[220px] rounded-b-[25px] bg-white/10" />
                    <div className="pointer-events-none absolute -left-20 -top-20 h-[200px] w-[200px] rounded-full bg-white/[0.06] blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-10 right-[30%] h-[160px] w-[160px] rounded-full bg-white/[0.05] blur-3xl" />
                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] xl:items-center">
                      <div className="space-y-5 pt-2 text-white">
                        <h1 className="max-w-[18ch] text-[clamp(2.2rem,4vw,2.8rem)] font-bold leading-[1.08] tracking-[-0.01em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.10)]">
                          {course.title}
                        </h1>
                        <p className="max-w-[42rem] text-[clamp(1.15rem,2vw,1.4rem)] font-medium leading-[1.5] text-white/90">
                          {course.subtitle?.trim() || course.description?.trim() ||
                            "Build design aptitude, logical reasoning, and visual skills through a focused preparation path."}
                        </p>
                        {course.subtitle && course.description && (
                          <p className="mt-1 max-w-[42rem] text-[clamp(0.9rem,1.5vw,1.05rem)] leading-[1.6] text-white/70">
                            {course.description.trim()}
                          </p>
                        )}
                      </div>

                      <FloatPulse className="mx-auto xl:mx-0 xl:justify-self-end">
                        <div className="relative flex items-center justify-center">
                          <div className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.06] blur-3xl" />
                          <Image
                            alt=""
                            aria-hidden
                            className="relative h-auto w-[200px] object-contain drop-shadow-[0_24px_48px_rgba(0,0,0,0.20)] sm:w-[320px] xl:w-[420px]"
                            height={852}
                            src={assets.heroIllustration}
                            width={1561}
                          />
                        </div>
                      </FloatPulse>
                    </div>

                    <div className="relative z-10 mt-10 xl:mt-[86px] xl:max-w-[calc(100%_-_423px)] 2xl:max-w-[877px]">
                      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)]">
                        <div className="flex flex-col sm:flex-row">
                          <div className="flex min-h-[148px] w-full sm:w-[153px] shrink-0 flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#ffc107_0%,#ffab00_100%)] px-6 py-7 text-center text-white">
                            <div className="relative rounded-full rounded-bl-sm border border-white/40 bg-white/10 p-2.5 backdrop-blur-sm">
                              <Award className="h-6 w-6 text-white drop-shadow-sm" />
                            </div>
                            <p className="text-[20px] font-bold tracking-wide">Premium</p>
                          </div>

                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-6 px-5 py-6 sm:px-8 sm:py-4 flex-1">
                            <p className="text-[15px] leading-6 text-[#888] sm:max-w-[241px] min-w-[160px] flex-1 text-center sm:text-left">
                              The early explorers get 7 days exclusives
                            </p>

                            <div className="hidden h-[60px] w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent xl:hidden 2xl:block sm:block" />

                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-center gap-1.5 text-center text-black shrink-0">
                                <Users className="h-7 w-7 text-[#38c1ff]/70" />
                                <p className="text-[13px] font-semibold tabular-nums">{formatCompactCount(course._count.enrollments)}</p>
                                <p className="text-[14px] font-bold">Learners</p>
                              </div>

                              <div className="h-[60px] w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />

                              <div className="flex flex-col items-center gap-1 text-center text-black shrink-0">
                                <p className="text-[30px] font-extrabold leading-none tabular-nums">{course.courseRating || "4.7"}</p>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                    <Star key={i} className={cx("h-3.5 w-3.5", i <= Math.round(course.courseRating || 4.7) ? "fill-[#ffc107] text-[#ffc107]" : "fill-transparent text-[#ffc107]")} />
                                  ))}
                                </div>
                                <p className="text-[11px] text-[#999]">{Math.max(course._count.enrollments, 1259).toLocaleString("en-IN")} ratings</p>
                              </div>
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
                            <h2 className="text-[24px] font-bold text-black">What you&rsquo;ll learn</h2>
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
                            <h2 className="text-[24px] font-bold text-black">Course Overview</h2>
                          </div>
                          <div className="mt-8 grid gap-3">
                            {overviewItems.map((item, idx) => {
                              const icons = [Clock, BarChart3, Globe, Play];
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
                        <div id="curriculum" className="space-y-6">
                          {/* Curriculum header with total progress (enrolled only) */}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                                <ClipboardList className="h-[18px] w-[18px] text-[#38c1ff]" />
                              </div>
                              <h2 className="text-[24px] font-bold text-black">Course Curriculum</h2>
                            </div>
                            {isEnrolled && totalLessons > 0 && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[13px] font-medium text-[#4caf50]">
                                <CheckCircle2 className="h-4 w-4" />
                                {completedLessonCount} / {totalLessons} completed ({progressPercent}%)
                              </span>
                            )}
                          </div>

                          {course.chapters.length > 0 ? (
                            <div className="space-y-5">
                              {course.chapters.map((chapter, index) => {
                                const chapterCompletedCount = isEnrolled
                                  ? chapter.lessons.filter((l) => completedLessonIds.has(l.id)).length
                                  : 0;
                                const chapterTotal = chapter.lessons.length;
                                const chapterPercent =
                                  isEnrolled && chapterTotal > 0
                                    ? Math.round((chapterCompletedCount / chapterTotal) * 100)
                                    : 0;

                                return (
                                  <div key={chapter.id} className="space-y-3">
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

                                    {/* Chapter progress bar (enrolled only) */}
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
                                                  : "border-[#e9e9e9] bg-white text-black"
                                              }`}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                {/* Lesson number */}
                                                <span className={`shrink-0 text-[11px] font-semibold w-5 text-right ${done ? "text-green-500" : "text-[#bbb]"}`}>
                                                  {li + 1}
                                                </span>
                                                <span className="truncate">{lesson.title}</span>
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
                                                {/* Completion tick */}
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
                          ) : (
                            <div className="rounded-[10px] border border-dashed border-[#e9e9e9] px-5 py-10 text-[15px] text-[#8b8888]">
                              Curriculum will appear here as soon as lessons are published.
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
                                    <span className="text-[20px] font-semibold leading-tight sm:text-[24px]">
                                      {feature.label}
                                    </span>
                                  </Link>
                                </AnimCard>
                              ))}
                            </StaggerGrid>

                            <StaggerGrid className="mx-auto grid max-w-[440px] gap-5 md:grid-cols-2">
                              {featureTiles.slice(3).map((feature) => (
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
                                    <span className="text-[20px] font-semibold leading-tight sm:text-[24px]">
                                      {feature.label}
                                    </span>
                                  </Link>
                                </AnimCard>
                              ))}
                            </StaggerGrid>
                          </div>
                        </div>
                      </section>
                    </RevealSection>

                    <StaggerGrid className="grid gap-4 md:grid-cols-2">
                      {testimonialCards.map((testimonial) => (
                        <AnimCard key={testimonial.author + testimonial.quote}>
                          <section className="relative rounded-[20px] bg-white px-8 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 h-full flex flex-col">
                            <Quote className="absolute right-6 top-6 h-10 w-10 text-gray-100" />
                            <div className="flex gap-1 mb-4 text-[#ffc107]">
                              {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                                <Star key={i} className="h-4 w-4 fill-current" />
                              ))}
                            </div>
                            <p className="flex-1 text-[16px] leading-[1.6] text-black italic">
                              &quot;{testimonial.quote}&quot;
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                              <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
                                <Image
                                  src={`https://api.dicebear.com/9.x/initials/svg?seed=${testimonial.author}`}
                                  alt={testimonial.author}
                                  width={40}
                                  height={40}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p className="text-[14px] font-semibold text-black">{testimonial.author}</p>
                            </div>
                          </section>
                        </AnimCard>
                      ))}
                    </StaggerGrid>

                    <RevealSection delay={0.14}>
                      <section className="rounded-[18px] bg-white px-6 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] sm:px-10 xl:px-[40px] xl:py-[47px]">
                        <div id="faqs" className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                              <MessageCircle className="h-[18px] w-[18px] text-[#38c1ff]" />
                            </div>
                            <h2 className="text-[24px] font-bold text-black">Frequently Asked Questions</h2>
                          </div>
                          <div className="space-y-3">
                            {faqItems.map((faq) => (
                              <div
                                key={faq.question}
                                className="overflow-hidden rounded-[14px] border border-gray-100 bg-white shadow-sm transition-all hover:border-[#38c1ff]/30 hover:shadow-md"
                              >
                                <div className="flex gap-4 px-[20px] py-[16px] text-[16px] font-semibold text-black bg-gray-50/50">
                                  <span className="text-[#38c1ff]">Q.</span>
                                  <span className="flex-1">{faq.question}</span>
                                </div>
                                <div className="flex gap-4 px-[20px] pb-[16px] pt-1 text-[15px] leading-[1.6] text-gray-600">
                                  <span className="text-gray-300">A.</span>
                                  <span className="flex-1">{faq.answer}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </section>
                    </RevealSection>
                  </div>

                  <div className="space-y-4 xl:-mt-[226px]">
                    <RevealSection delay={0.08}>
                      <aside className="rounded-[24px] bg-white px-[24px] pb-[24px] pt-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]">
                        <div className="space-y-5">
                          <div className="overflow-hidden rounded-[16px] bg-[#d9d9d9] shadow-inner">
                            <div
                              aria-hidden="true"
                              className="h-[184px] w-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
                              style={{
                                backgroundImage: course.thumbnail
                                  ? `linear-gradient(180deg, rgba(8, 16, 24, 0.02), rgba(8, 16, 24, 0.12)), url("${course.thumbnail}")`
                                  : `url("${assets.fallbackThumbnail}")`,
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <h2 className="text-[18px] font-bold leading-[1.3] text-black">
                              {course.title}
                            </h2>
                            <div className="flex items-center justify-between">
                              <p className="text-[13px] text-gray-500 font-medium">by <span className="text-black">{teacherName}</span></p>
                              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                                <Star className="h-3 w-3 fill-[#ffc107] text-[#ffc107]" />
                                <p className="text-[12px] font-bold text-yellow-700">4.7</p>
                              </div>
                            </div>
                            
                            {isEnrolled && totalLessons > 0 ? (
                              <div className="pt-2 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <p className="text-[12px] font-semibold text-[#4caf50]">
                                    {completedLessonCount} / {totalLessons} lessons
                                  </p>
                                  <p className="text-[12px] font-bold text-[#4caf50]">{progressPercent}%</p>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                                  <div
                                    className="h-full rounded-full bg-[linear-gradient(90deg,#4caf50,#34d399)] shadow-[0_0_8px_rgba(76,175,80,0.4)]"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-[16px] border border-gray-100 bg-gray-50/50 p-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#38c1ff]/10">
                                <Shield className="h-3.5 w-3.5 text-[#38c1ff]" />
                              </div>
                              <p className="text-[13px] font-semibold text-gray-600">
                                {course.price > 0 ? "Full Access" : "Open Access"}
                              </p>
                            </div>

                            <div className="mt-3 flex items-end gap-2.5">
                              <p className="text-[28px] font-extrabold leading-none tracking-tight text-black">
                                {formatPrice(course.price)}
                              </p>
                              {course.price > 0 && originalPrice > course.price ? (
                                <p className="mb-1 text-[13px] font-semibold text-gray-400 line-through">
                                  ₹{originalPrice.toLocaleString("en-IN")}
                                </p>
                              ) : null}
                            </div>

                            {course.price > 0 && discountPercent > 0 && (
                              <div className="mt-2 inline-flex rounded-full bg-green-100 px-2 py-0.5">
                                <p className="text-[11px] font-bold text-green-700">
                                  {discountPercent}% OFF APPLIED
                                </p>
                              </div>
                            )}
                          </div>

                          {course.price > 0 && emiPlans ? (
                            <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-sm">
                              <div className="space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50">
                                    <Award className="h-3.5 w-3.5 text-purple-500" />
                                  </div>
                                  <p className="text-[13px] font-semibold text-black">Pay in Instalments</p>
                                  <span className="ml-auto rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                                    CUSTOM EMI
                                  </span>
                                </div>
                                <table className="w-full text-[12px]">
                                  <thead>
                                    <tr className="border-b border-gray-100">
                                      <th className="pb-1.5 pt-1 text-left font-semibold text-[#94a3b8]">#</th>
                                      <th className="pb-1.5 pt-1 text-left font-semibold text-[#94a3b8]">Amount</th>
                                      <th className="pb-1.5 pt-1 text-left font-semibold text-[#94a3b8]">Due</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {emiPlans.map((plan, i) => (
                                      <tr key={i} className="border-b border-gray-50 last:border-0">
                                        <td className="py-1.5 pr-2 font-medium text-[#475569]">{plan.label || `${i + 1}.`}</td>
                                        <td className="py-1.5 pr-2 font-bold text-black">₹{plan.amount.toLocaleString("en-IN")}</td>
                                        <td className="py-1.5 text-[#64748b]">{plan.dueDays === 0 ? 'On enrollment' : `${plan.dueDays} days`}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                <p className="text-[11px] text-[#94a3b8]">
                                  Total: ₹{emiPlans.reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")} over {emiPlans.length} instalment{emiPlans.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-sm">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                  </div>
                                  <p className="text-[13px] font-semibold text-black">Free Enrollment</p>
                                </div>
                                <p className="text-[12px] leading-[1.5] text-gray-500">
                                  Get course access, modules, tests, and live sessions from your dashboard.
                                </p>
                              </div>
                            </div>
                          )}

                          {isEnrolled ? (
                            <Link
                              className="inline-flex h-[37px] w-full items-center justify-center rounded-[10px] border border-[#d9d9d9] bg-[#38c1ff] px-4 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(56,193,255,0.24)] transition-transform duration-150 ease-out hover:-translate-y-0.5"
                              href={primaryActionHref}
                            >
                              Continue Course
                            </Link>
                          ) : (
                            <div className="pt-2">
                              <EnrollButton
                                courseId={course.id}
                                courseTitle={course.title}
                                initialEnrolled={false}
                                price={course.price}
                                variant="detailCard"
                              />
                            </div>
                          )}
                        </div>
                      </aside>
                    </RevealSection>

                    <RevealSection delay={0.1}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <AnimCard>
                          <Link
                            className="group flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[20px] bg-[linear-gradient(135deg,#38c1ff_0%,#45caff_100%)] px-6 py-6 text-center text-white shadow-[0_8px_20px_rgba(56,193,255,0.25)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(56,193,255,0.35)]"
                            href={`/dashboard/courses/${course.slug}/tests`}
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                              <ClipboardList className="h-7 w-7 text-white" />
                            </div>
                            <span className="text-[20px] font-bold">Explore Tests</span>
                          </Link>
                        </AnimCard>

                        <AnimCard>
                          <Link
                            className="group flex min-h-[160px] flex-col items-center justify-center gap-4 rounded-[20px] bg-[linear-gradient(135deg,#2db4f0_0%,#38c1ff_100%)] px-6 py-6 text-center text-white shadow-[0_8px_20px_rgba(45,180,240,0.25)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(45,180,240,0.35)]"
                            href="#curriculum"
                          >
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
                              <BookOpen className="h-7 w-7 text-white" />
                            </div>
                            <span className="text-[20px] font-bold">View Modules</span>
                          </Link>
                        </AnimCard>
                      </div>
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
