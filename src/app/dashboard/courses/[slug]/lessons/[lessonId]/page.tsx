import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell";
import { CustomVideoPlayer } from "@/components/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonDiscussion } from "@/components/lesson-discussion";
import { LessonCompleteButton } from "./_components/lesson-complete-button";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { verifyTokenValue, AUTH_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

type Props = {
  params: Promise<{ slug: string; lessonId: string }>;
};

export default async function LessonPage({ params }: Props) {
  const { slug, lessonId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const decoded = await verifyTokenValue(token);

  if (!decoded) {
    redirect("/login");
  }

  // Load course with ALL published lessons (for prev/next navigation + total count)
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      chapters: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              contentType: true,
              contentUrl: true,
              bodyText: true,
              isFreePreview: true,
              durationMins: true,
            },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: decoded.userId, courseId: course.id } },
    select: { id: true, progressPercent: true },
  });

  const allLessons = course.chapters.flatMap((c) => c.lessons);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[currentLessonIndex];

  if (!lesson) notFound();

  if (!enrollment && !lesson.isFreePreview && decoded.role === "STUDENT") {
    redirect(`/dashboard/courses/${slug}`);
  }

  // Fetch real completed lesson count for this student
  let completedCount = 0;
  let isAlreadyCompleted = false;

  if (decoded.role === "STUDENT" && enrollment) {
    const allLessonIds = allLessons.map((l) => l.id);

    const completedRows = await prisma.lessonProgress.findMany({
      where: {
        userId: decoded.userId,
        lessonId: { in: allLessonIds },
        isCompleted: true,
      },
      select: { lessonId: true },
    });

    completedCount = completedRows.length;
    isAlreadyCompleted = completedRows.some((r) => r.lessonId === lessonId);
  }

  const totalLessons = allLessons.length;
  const progressPercent =
    totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  const isStudent = decoded.role === "STUDENT" && !!enrollment;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl py-8">
        {/* ── Top bar ── */}
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <Link
            href={`/dashboard/courses/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-(--text-muted) hover:text-(--brand-primary-strong) transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Course
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            {lesson.isFreePreview && <Badge tone="warning">Free Preview</Badge>}
            <Badge tone="neutral">{lesson.contentType}</Badge>
            {/* Lesson position indicator */}
            <span className="text-[13px] text-(--text-muted) font-medium">
              Lesson {currentLessonIndex + 1} of {totalLessons}
            </span>
          </div>
        </div>

        {/* ── Progress bar (only for enrolled students) ── */}
        {isStudent && totalLessons > 0 && (
          <div className="mb-6 rounded-[12px] border border-(--line-soft) bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-(--text-strong)">
                <BookOpen className="h-4 w-4 text-(--brand-primary)" />
                Course Progress
              </div>
              <span className="text-[13px] font-semibold text-(--text-strong)">
                {completedCount} / {totalLessons} lessons
                <span className="ml-1.5 text-(--text-muted) font-normal">({progressPercent}%)</span>
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/6">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#38c1ff,#6271ff)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-(--text-strong)">
          {lesson.title}
        </h1>

        {/* ── Content ── */}
        <div className="my-8 overflow-hidden rounded-2xl bg-black">
          {lesson.contentType === "VIDEO" && lesson.contentUrl ? (
            <CustomVideoPlayer videoUrl={lesson.contentUrl} />
          ) : lesson.contentType === "PDF" && lesson.contentUrl ? (
            <iframe
              src={`${lesson.contentUrl}#toolbar=0`}
              className="h-[800px] w-full"
              title={lesson.title}
            />
          ) : (
            <div
              className="prose max-w-none p-8 dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: lesson.bodyText || "" }}
            />
          )}
        </div>

        {/* ── Mark Complete button (students only) ── */}
        {isStudent && (
          <div className="mt-2 mb-8">
            <LessonCompleteButton
              lessonId={lessonId}
              courseSlug={slug}
              nextLessonId={nextLesson?.id ?? null}
              initialCompleted={isAlreadyCompleted}
            />
          </div>
        )}

        {/* ── Discussion ── */}
        <LessonDiscussion lessonId={lesson.id} />

        {/* ── Prev / Next navigation ── */}
        <div className="mt-10 flex items-center justify-between border-t border-(--line-soft) pt-6">
          {prevLesson ? (
            <Link href={`/dashboard/courses/${slug}/lessons/${prevLesson.id}`}>
              <Button variant="secondary">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous Lesson
              </Button>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link href={`/dashboard/courses/${slug}/lessons/${nextLesson.id}`}>
              <Button>
                Next Lesson
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href={`/dashboard/courses/${slug}`}>
              <Button variant="soft">
                {progressPercent === 100 ? "🎉 Course Complete!" : "Back to Course"}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
