import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardShell } from "@/app/dashboard/_components/dashboard-shell";
import { CustomVideoPlayer } from "@/components/video-player";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LessonDiscussion } from "@/components/lesson-discussion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  // Verify enrollment or free preview
  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      chapters: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!course) notFound();

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: decoded.userId, courseId: course.id } },
  });

  const allLessons = course.chapters.flatMap((c) => c.lessons);
  const currentLessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  const lesson = allLessons[currentLessonIndex];

  if (!lesson) notFound();

  if (!enrollment && !lesson.isFreePreview && decoded.role === "STUDENT") {
    // If not enrolled and not a free preview, error out or redirect to course page
    redirect(`/dashboard/courses/${slug}`);
  }

  if (decoded.role === "STUDENT") {
    const progress = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: decoded.userId, lessonId: lesson.id } },
    });
    if (progress) {
      // Not tracked in DB schema accurately for time currently?
      // You can store time in `completedAt` or similar. We'll add an API to sync later.
    }
  }

  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/dashboard/courses/${slug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary-strong)]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Course
          </Link>
          <div className="flex gap-2">
            {lesson.isFreePreview && <Badge tone="warning">Free Preview</Badge>}
            <Badge tone="neutral">{lesson.contentType}</Badge>
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-[var(--text-strong)]">
          {lesson.title}
        </h1>

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
            <div className="prose max-w-none p-8 dark:prose-invert" dangerouslySetInnerHTML={{ __html: lesson.bodyText || "" }} />
          )}
        </div>

        {/* Per-lesson discussion */}
        <LessonDiscussion lessonId={lesson.id} />

        <div className="mt-10 flex items-center justify-between border-t border-[var(--line-soft)] pt-6">
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
              <Button variant="soft">Complete Course</Button>
            </Link>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
