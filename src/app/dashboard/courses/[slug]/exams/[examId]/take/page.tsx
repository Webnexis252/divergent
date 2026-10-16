import { requirePageAuth } from "@/lib/page-auth";
import prisma from "@/lib/prisma";
import { courseRelation } from "@/lib/course-access";
import { notFound, redirect } from "next/navigation";
import { ExamClient } from "./_components/exam-client";

type Params = { params: Promise<{ slug: string; examId: string }> };

// Everything the exam screen needs and nothing it mustn't have: this page's
// props are serialised into the HTML, so answer keys, explanations and
// reference images must never be selected here.
const QUESTION_FIELDS_FOR_STUDENTS = {
  id: true,
  type: true,
  category: true,
  prompt: true,
  options: true,
  imageUrl: true,
  points: true,
  negativeMarks: true,
  allowPartialMarking: true,
  groupId: true,
  order: true,
} as const;

export default async function ExamTakePage({ params }: Params) {
  const auth = await requirePageAuth(["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"]);
  if (!auth) return null;

  const { slug, examId } = await params;
  const student = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });

  // Verify exam exists and belongs to the course
  const exam = await prisma.courseTest.findUnique({
    where: { id: examId },
    include: {
      course: { select: { title: true, slug: true } },
      parts: {
        orderBy: { order: 'asc' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              groups: { orderBy: { order: 'asc' } },
              questions: { orderBy: { order: 'asc' }, select: QUESTION_FIELDS_FOR_STUDENTS },
            }
          }
        }
      }
    },
  });

  if (!exam || exam.course.slug !== slug) {
    notFound();
  }

  // Teachers of this course and admins can preview any test; students need an
  // enrollment, a published test and the availability window
  const relation = await courseRelation(auth, exam.courseId);
  if (relation === "none") redirect(`/dashboard/courses/${slug}`);
  if (relation === "student") {
    if (exam.status !== "PUBLISHED") notFound();
    const now = new Date();
    const outsideWindow =
      (exam.availableFrom && now < exam.availableFrom) || (exam.availableUntil && now > exam.availableUntil);
    if (outsideWindow) redirect(`/dashboard/courses/${slug}`);
  }

  // Pass necessary data to the client component
  return (
    <ExamClient 
      exam={{
        id: exam.id,
        title: exam.title,
        durationMins: exam.durationMins,
        courseTitle: exam.course.title,
        courseId: exam.courseId,
      }}
      parts={exam.parts}
      studentName={student?.name?.trim() || auth.email.split("@")[0] || "Student"}
      studentEmail={student?.email || auth.email}
      studentPhone={student?.phone || "Phone not provided"}
    />
  );
}
