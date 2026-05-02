import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollmentStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { cx } from "@/lib/cx";
import { getPageAuth } from "@/lib/page-auth";
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
  Star
} from "lucide-react";

export const dynamic = "force-dynamic";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const assets = {
  heroIllustration: "https://api.dicebear.com/9.x/shapes/svg?seed=db6c0edc-45d2-4a72-bc8c-fda1cf5c7daa",
  premiumBadge: "https://api.dicebear.com/9.x/shapes/svg?seed=d69210fb-fac4-4a3f-ae58-7426f89af020",
  learnersIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=8bba02c3-8180-4d46-b5cd-f071d8a40f43",
  ratings: "https://api.dicebear.com/9.x/shapes/svg?seed=58f66a79-9fb4-4b1a-a7cb-df0e2291a488",
  divider: "https://api.dicebear.com/9.x/shapes/svg?seed=0c1d4445-8c2f-4539-95cc-a8cb555bb081",
  fallbackThumbnail: "https://api.dicebear.com/9.x/shapes/svg?seed=cf170519-6960-44d6-913f-b1df537a439e",
  mentorAvatar: "https://api.dicebear.com/9.x/shapes/svg?seed=1fdd695f-0eb2-4964-b9f7-d3b9472b043a",
  buyNowIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=302f0b9c-5f11-4d9d-ab89-dfad0999d3f4",
  emiIcon: "https://api.dicebear.com/9.x/shapes/svg?seed=104750b5-4aac-439b-a0d7-04c01181c5da",
  liveClassFeature: "https://api.dicebear.com/9.x/shapes/svg?seed=51a28b6c-a3eb-49f6-9945-ee2c67715253",
  doubtSolvingFeature: "https://api.dicebear.com/9.x/shapes/svg?seed=12ce6314-ad2e-4ad8-a98a-16a52e99a04e",
  mockTestsFeature: "https://api.dicebear.com/9.x/shapes/svg?seed=a1c20d05-60d6-4863-b5ec-a6357bda9f84",
  communityFeature: "https://api.dicebear.com/9.x/shapes/svg?seed=47dbd472-4af1-4232-a9ab-eb697c5c0dd5",
  certificateFeature: "https://api.dicebear.com/9.x/shapes/svg?seed=6bec0872-3a9c-4711-92a9-c58333b7f917",
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

import { studentNavItems } from "../../_components/sidebar-nav";

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
        progressPercent: true,
      },
    });
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const auth = await getPageAuth(["STUDENT"]);
  const { slug } = await params;

  const course = await prisma.course.findUnique({
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
  });

  if (!course || !course.isPublished) {
    notFound();
  }

  const enrollment = auth?.userId
    ? await getCourseEnrollment(auth.userId, course.id)
    : null;

  const isEnrolled =
    enrollment && "status" in enrollment
      ? enrollment.status === EnrollmentStatus.ACTIVE ||
        enrollment.status === EnrollmentStatus.COMPLETED ||
        enrollment.status === EnrollmentStatus.PAUSED
      : Boolean(enrollment?.id);

  const teacherName = course.teachers?.[0]?.name ?? "Expert Mentors";
  const totalLessons = countLessons(course.chapters);
  const totalDuration = countDuration(course.chapters);
  const previewCount = course.chapters.reduce(
    (sum, chapter) => sum + chapter.lessons.filter((lesson) => lesson.isFreePreview).length,
    0,
  );
  const firstLesson = course.chapters.find((chapter) => chapter.lessons.length > 0)?.lessons[0] ?? null;
  const nextLiveClass = course.liveClasses.find((item) => !item.recordingUrl) ?? course.liveClasses[0] ?? null;
  const originalPrice =
    course.price > 0 ? Math.max(Math.round(course.price / 0.56), Math.round(course.price)) : 0;
  const discountPercent =
    course.price > 0 && originalPrice > course.price
      ? Math.max(1, Math.round((1 - course.price / originalPrice) * 100))
      : 0;
  const emiAmount = course.price > 0 ? Math.max(1, Math.round(course.price / 12)) : 0;
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
      image: course.teachers?.[0]?.image ?? assets.mentorAvatar,
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
    ? (course.features as any[]).map(f => ({ label: f.title, image: f.icon || assets.liveClassFeature, href: "#" }))
    : [
    {
      label: "Live Class",
      image: assets.liveClassFeature,
      href: nextLiveClass ? `/dashboard/live-classes/${nextLiveClass.id}` : "/dashboard/live-classes",
    },
    {
      label: "Doubt solving",
      image: assets.doubtSolvingFeature,
      href: "/dashboard/community",
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
      href: "/dashboard/progress",
    },
  ];
  const testimonialCards = Array.isArray(course.testimonials) && course.testimonials.length > 0
    ? (course.testimonials as any[]).map(t => ({ quote: t.text, author: t.name, rating: t.rating }))
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
    ? (course.faqs as any[])
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
  const progressPercent = Math.max(0, Math.min(100, Math.round(enrollment?.progressPercent ?? 0)));
  const primaryActionHref = firstLesson
    ? `/dashboard/courses/${course.slug}/lessons/${firstLesson.id}`
    : "#curriculum";

  return (
    <PageTransition>
      <main className="min-h-screen overflow-x-hidden bg-[#f9fafb] pb-24 sm:bg-[#f7f5f4] sm:pb-0">


        <div className="mx-auto max-w-[1920px] px-3 pb-14 pt-4 sm:px-6 sm:pt-6 xl:px-0 xl:pb-24">
          <div className="grid gap-6 xl:grid-cols-[222px_minmax(0,1fr)] xl:items-start">
            <RevealSection className="hidden xl:block xl:pr-7">
              <aside className="sticky top-3 z-20 -mx-1 overflow-hidden rounded-[28px] border border-[#ffe08a] bg-[linear-gradient(180deg,#ffcb2f_0%,#ffe58f_100%)] px-3 py-3 shadow-[0_16px_36px_rgba(254,198,0,0.22)] xl:static xl:mx-0 xl:rounded-l-[0] xl:rounded-r-[40px] xl:border-none xl:bg-[linear-gradient(180deg,#ffbf00_0%,#ffd86a_100%)] xl:px-7 xl:py-12 xl:shadow-[0_18px_48px_rgba(254,198,0,0.18)]">
                <nav className="scrollbar-none flex snap-x gap-2 overflow-x-auto pb-0.5 xl:flex-col xl:gap-1 xl:overflow-visible">
                  {sidebarItems.map((item) => (
                    <Link
                      key={item.href}
                      className={cx(
                        "flex min-w-max snap-start items-center gap-2.5 rounded-[20px] bg-white/28 px-3 py-2.5 text-[13px] font-semibold text-black transition-colors duration-[var(--transition-fast)] xl:min-h-[56px] xl:gap-4 xl:rounded-[22px] xl:bg-transparent xl:px-5 xl:py-3 xl:text-[18px] xl:font-medium",
                        ("active" in item && item.active)
                          ? "bg-white/78 shadow-[0_10px_22px_rgba(0,0,0,0.08)] xl:bg-white/16 xl:shadow-none"
                          : "hover:bg-white/46 xl:hover:bg-white/20",
                      )}
                      href={item.href}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </aside>
            </RevealSection>

            <section className="relative px-0 sm:px-4 xl:pr-10">
              <div className="mx-auto max-w-[1368px]">
                <RevealSection>
                  <div className="relative overflow-hidden rounded-[24px] bg-[#38c1ff] px-6 pb-12 pt-10 sm:px-10 lg:px-14 xl:min-h-[436px] xl:px-[70px] xl:pb-20 xl:pt-[52px]">
                    <div className="pointer-events-none absolute right-[170px] top-0 h-[34px] w-[220px] rounded-b-[25px] bg-white/20" />
                    <div className="pointer-events-none absolute right-[116px] top-0 h-[93px] w-[117px] rounded-bl-[20px] rounded-tr-[40px] bg-white/22" />
                    <div className="pointer-events-none absolute bottom-[112px] right-[116px] h-[43px] w-[220px] rounded-b-[25px] bg-white/14" />
                    <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,865px)_260px] xl:items-start">
                      <div className="space-y-4 pt-2 text-white">
                        <h1 className="max-w-[18ch] text-[clamp(2.2rem,4vw,2.5rem)] font-semibold leading-[1.12]">
                          {course.title}
                        </h1>
                        <p className="max-w-[42rem] text-[clamp(1.2rem,2vw,1.5rem)] font-medium leading-[1.45] text-white/94">
                          {course.subtitle?.trim() || course.description?.trim() ||
                            "Build design aptitude, logical reasoning, and visual skills through a focused preparation path."}
                        </p>
                        {course.subtitle && course.description && (
                          <p className="mt-2 max-w-[42rem] text-[clamp(0.9rem,1.5vw,1.1rem)] leading-[1.5] text-white/80">
                            {course.description.trim()}
                          </p>
                        )}
                      </div>

                      <FloatPulse className="mx-auto xl:mx-0 xl:justify-self-end">
                        <div className="relative h-[160px] w-[176px] sm:h-[190px] sm:w-[210px] xl:h-[178px] xl:w-[195px]">
                          <Image
                            alt=""
                            aria-hidden
                            className="object-contain"
                            fill
                            sizes="195px"
                            src={assets.heroIllustration}
                          />
                        </div>
                      </FloatPulse>
                    </div>

                    <div className="relative z-10 mt-10 xl:mt-[86px]">
                      <div className="overflow-hidden rounded-[10px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] xl:max-w-[877px]">
                        <div className="grid gap-5 sm:grid-cols-[153px_minmax(0,1fr)]">
                          <div className="flex min-h-[148px] flex-col items-center justify-center gap-3 bg-[#ffc107] px-6 py-7 text-center text-white">
                            <div className="relative rounded-full rounded-bl-sm border border-white/40 p-2">
                              <Award className="h-6 w-6 text-white drop-shadow-sm" />
                            </div>
                            <p className="text-[20px] font-semibold">Premium</p>
                          </div>

                          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_1px_88px_1px_94px] sm:items-center sm:px-8 sm:py-0">
                            <p className="text-[15px] leading-7 text-[#888] sm:max-w-[241px]">
                              The early explorers get 7 days exclusives
                            </p>

                            <div className="hidden justify-center sm:flex">
                              <div className="h-[90px] w-px bg-gray-200" />
                            </div>

                            <div className="flex flex-col items-center gap-2 text-center text-black">
                              <Users className="h-8 w-8 text-black/60" />
                              <p className="text-[12px]">{formatCompactCount(course._count.enrollments)}</p>
                              <p className="text-[16px] font-bold">Learners</p>
                            </div>

                            <div className="hidden justify-center sm:flex">
                              <div className="h-[90px] w-px bg-gray-200" />
                            </div>

                            <div className="flex flex-col items-center gap-1.5 text-center text-black">
                              <p className="text-[32px] font-bold leading-none">{course.courseRating || "4.7"}</p>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} className={cx("h-3.5 w-3.5", i <= Math.round(course.courseRating || 4.7) ? "fill-[#ffc107] text-[#ffc107]" : "fill-transparent text-[#ffc107]")} />
                                ))}
                              </div>
                              <p className="text-[12px]">{Math.max(course._count.enrollments, 1259).toLocaleString("en-IN")} ratings</p>
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
                      <section className="rounded-[10px] bg-white px-6 py-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:px-10 xl:px-11 xl:py-[42px]">
                        <div id="what-youll-learn" className="space-y-5">
                          <h2 className="text-[24px] font-semibold text-black">What you&rsquo;ll learn</h2>
                          <ul className="grid gap-2 text-[15px] leading-7 text-[#aeaeae] sm:text-[16px]">
                            {learningItems.map((item) => (
                              <li key={item} className="ml-6 list-disc">
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>
                    </RevealSection>

                    <div className="grid gap-6 xl:grid-cols-[407px_minmax(0,1fr)] xl:items-start">
                      <RevealSection delay={0.08}>
                        <section className="rounded-[10px] bg-white px-7 py-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] xl:min-h-[247px]">
                          <h2 className="text-[24px] font-semibold text-black">Course Overview</h2>
                          <ul className="mt-8 grid gap-3 text-[16px] leading-7 text-[#b3b3b3]">
                            {overviewItems.map((item) => (
                              <li key={item} className="ml-6 list-disc">
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </RevealSection>

                      <StaggerGrid className="grid gap-4 sm:grid-cols-2">
                        {mentorCards.map((mentor) => (
                          <AnimCard key={mentor.name}>
                            <section className="rounded-[10px] bg-white px-4 py-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.06)] xl:min-h-[247px]">
                              <div className="mx-auto h-[82px] w-[82px] overflow-hidden rounded-full bg-[#d9d9d9]">
                                <div
                                  aria-hidden="true"
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${mentor.image}")` }}
                                />
                              </div>
                              <div className="mt-4 space-y-1">
                                <p className="text-[16px] font-medium text-black">{mentor.name}</p>
                                <p className="text-[12px] text-black">{mentor.subtitle}</p>
                              </div>
                              <p className="mt-4 text-[11px] leading-5 text-black">{mentor.body}</p>
                            </section>
                          </AnimCard>
                        ))}
                      </StaggerGrid>
                    </div>

                    <RevealSection delay={0.1}>
                      <section className="rounded-[10px] bg-white px-6 py-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:px-10 xl:px-[38px] xl:py-10">
                        <div id="curriculum" className="space-y-6">
                          <h2 className="text-[24px] font-semibold text-black">Course Curriculum</h2>

                          {course.chapters.length > 0 ? (
                            <div className="space-y-5">
                              {course.chapters.map((chapter, index) => (
                                <div key={chapter.id} className="space-y-3">
                                  <p className="text-[20px] font-medium text-black">
                                    Module {index + 1}:
                                  </p>
                                  {chapter.lessons.length > 0 ? (
                                    chapter.lessons.map((lesson) => (
                                      <div
                                        key={lesson.id}
                                        className="flex min-h-[44px] items-center rounded-[10px] border border-[#e9e9e9] px-[13px] py-[11px] text-[15px] text-black"
                                      >
                                        {lesson.title}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="flex min-h-[44px] items-center rounded-[10px] border border-[#e9e9e9] px-[13px] py-[11px] text-[15px] text-[#8b8888]">
                                      Lessons will appear here soon.
                                    </div>
                                  )}
                                </div>
                              ))}
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
                      <section className="rounded-[10px] bg-white px-6 py-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:px-10 xl:px-[103px] xl:py-[43px]">
                        <div className="space-y-9">
                          <h2 className="text-[24px] font-semibold text-black">Features</h2>

                          <div className="space-y-5">
                            <StaggerGrid className="grid gap-5 md:grid-cols-3">
                              {featureTiles.slice(0, 3).map((feature) => (
                                <AnimCard key={feature.label}>
                                  <Link
                                    className="flex min-h-[179px] flex-col items-center justify-center gap-[7px] rounded-[20px] bg-[#71d3ff] px-6 py-[15px] text-center text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                                    href={feature.href}
                                  >
                                    <Image
                                      alt={feature.label}
                                      className="h-auto w-[140px] object-contain drop-shadow-2xl"
                                      height={140}
                                      src={feature.image}
                                      width={140}
                                    />
                                    <span className="text-[24px] font-semibold leading-tight">
                                      {feature.label}
                                    </span>
                                  </Link>
                                </AnimCard>
                              ))}
                            </StaggerGrid>

                            <StaggerGrid className="mx-auto grid max-w-[440px] gap-5 md:grid-cols-2">
                              {featureTiles.slice(3).map((feature) => (
                                <AnimCard key={feature.label}>
                                  <Link
                                    className="flex min-h-[179px] flex-col items-center justify-center gap-[7px] rounded-[20px] bg-[#71d3ff] px-6 py-[15px] text-center text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                                    href={feature.href}
                                  >
                                    <Image
                                      alt={feature.label}
                                      className="h-auto w-[140px] object-contain drop-shadow-2xl"
                                      height={140}
                                      src={feature.image}
                                      width={140}
                                    />
                                    <span className="text-[24px] font-semibold leading-tight">
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
                          <section className="rounded-[20px] bg-white px-8 py-7 text-right shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
                            <p className="text-[20px]">
                              {Array.from({ length: testimonial.rating || 5 }).map(() => "⭐").join("")}
                            </p>
                            <p className="mt-3 text-left text-[15px] leading-7 text-black">
                              {testimonial.quote}
                            </p>
                            <p className="mt-4 text-[15px] text-black">— {testimonial.author}</p>
                          </section>
                        </AnimCard>
                      ))}
                    </StaggerGrid>

                    <RevealSection delay={0.14}>
                      <section className="rounded-[10px] bg-white px-6 py-8 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:px-10 xl:px-[29px] xl:py-[47px]">
                        <div id="faqs" className="space-y-5">
                          <h2 className="text-[24px] font-semibold text-black">FAQs</h2>
                          <div className="space-y-4">
                            {faqItems.map((faq) => (
                              <div
                                key={faq.question}
                                className="overflow-hidden rounded-[10px] border border-[#e9e9e9]"
                              >
                                <div className="bg-[#feefef] px-[13px] py-[11px] text-[15px] font-medium text-black">
                                  Q: {faq.question}
                                </div>
                                <div className="bg-white px-[13px] py-[11px] text-[15px] text-black">
                                  A: {faq.answer}
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
                      <aside className="rounded-[10px] bg-white px-[21px] pb-5 pt-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
                        <div className="space-y-3">
                          <div className="overflow-hidden rounded-[10px] bg-[#d9d9d9]">
                            <div
                              aria-hidden="true"
                              className="h-[184px] w-full bg-cover bg-center"
                              style={{
                                backgroundImage: course.thumbnail
                                  ? `linear-gradient(180deg, rgba(8, 16, 24, 0.04), rgba(8, 16, 24, 0.18)), url("${course.thumbnail}")`
                                  : `url("${assets.fallbackThumbnail}")`,
                              }}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <h2 className="text-[16px] font-semibold leading-[1.25] text-black">
                              {course.title}
                            </h2>
                            <p className="text-[12px] text-[#959595]">by {teacherName}</p>
                            <p className="text-[12px] font-medium text-black">
                              ⭐ 4.7 ({formatAudienceLabel(course._count.enrollments)})
                            </p>
                            {isEnrolled ? (
                              <p className="text-[11px] text-[#4caf50]">{progressPercent}% completed so far</p>
                            ) : null}
                          </div>

                          <div className="rounded-[10px] border border-[#d9d9d9] px-[17px] py-[12px]">
                            <div className="flex items-center gap-2">
                              <Image
                                alt=""
                                aria-hidden
                                className="h-auto w-[10px] object-contain"
                                height={11}
                                src={assets.buyNowIcon}
                                width={10}
                              />
                              <p className="text-[12px] font-semibold text-black">
                                {course.price > 0 ? "Buy now" : "Instant access"}
                              </p>
                            </div>

                            <div className="mt-2 flex items-end gap-2">
                              <p className="text-[20px] font-semibold leading-none text-black">
                                {formatPrice(course.price)}
                              </p>
                              {course.price > 0 && originalPrice > course.price ? (
                                <p className="pb-0.5 text-[10px] leading-none text-[#d1d1d1] line-through">
                                  ₹{originalPrice.toLocaleString("en-IN")}
                                </p>
                              ) : null}
                            </div>

                            <p className="mt-1 text-[12px] font-medium text-[#4caf50]">
                              {course.price > 0 && discountPercent > 0 ? `${discountPercent}% OFF` : "Open access"}
                            </p>
                          </div>

                          <div className="rounded-[10px] border border-[#d9d9d9] px-[17px] py-[15px]">
                            {course.price > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Image
                                    alt=""
                                    aria-hidden
                                    className="h-auto w-[14px] object-contain"
                                    height={10}
                                    src={assets.emiIcon}
                                    width={14}
                                  />
                                  <p className="text-[12px] font-semibold text-black">Pay with EMI</p>
                                  <span className="rounded-[2px] border border-[#4caf50] bg-[rgba(76,175,80,0.1)] px-1.5 py-0.5 text-[8px] font-semibold text-[#4caf50]">
                                    No Cost EMI
                                  </span>
                                </div>
                                <p className="text-[11px] leading-5 text-[#959595]">
                                  Starting at <span className="font-semibold text-black">₹{emiAmount.toLocaleString("en-IN")}</span>/month for 12 months.
                                </p>
                                <p className="text-[10px] font-medium text-[#38c1ff] underline">
                                  View all EMI Plans
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-[12px] font-semibold text-black">Included with enrollment</p>
                                <p className="text-[11px] leading-5 text-[#959595]">
                                  Get course access, modules, tests, and any upcoming live sessions from your student dashboard.
                                </p>
                              </div>
                            )}
                          </div>

                          {isEnrolled ? (
                            <Link
                              className="inline-flex h-[37px] w-full items-center justify-center rounded-[10px] border border-[#d9d9d9] bg-[#38c1ff] px-4 text-[12px] font-semibold text-white shadow-[0_4px_10px_rgba(56,193,255,0.24)] transition-transform duration-[var(--transition-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5"
                              href={primaryActionHref}
                            >
                              Continue Course
                            </Link>
                          ) : (
                            <EnrollButton
                              courseId={course.id}
                              courseTitle={course.title}
                              initialEnrolled={false}
                              price={course.price}
                              variant="detailCard"
                            />
                          )}
                        </div>
                      </aside>
                    </RevealSection>

                    <RevealSection delay={0.1}>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <AnimCard>
                          <Link
                            className="flex min-h-[179px] flex-col items-center justify-center gap-[7px] rounded-[20px] bg-[#71d3ff] px-6 py-[15px] text-center text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                            href={`/dashboard/courses/${course.slug}/tests`}
                          >
                            <Image
                              alt="Tests"
                              className="h-auto w-[101px] object-contain"
                              height={108}
                              src={assets.testsTile}
                              width={101}
                            />
                            <span className="text-[24px] font-semibold">Tests</span>
                          </Link>
                        </AnimCard>

                        <AnimCard>
                          <Link
                            className="flex min-h-[179px] flex-col items-center justify-center gap-[7px] rounded-[20px] bg-[#71d3ff] px-6 py-[15px] text-center text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
                            href="#curriculum"
                          >
                            <Image
                              alt="Modules"
                              className="h-auto w-[101px] object-contain"
                              height={108}
                              src={assets.modulesTile}
                              width={101}
                            />
                            <span className="text-[24px] font-semibold">Modules</span>
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
