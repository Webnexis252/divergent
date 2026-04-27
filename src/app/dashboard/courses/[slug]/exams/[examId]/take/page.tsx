import { requirePageAuth } from "@/lib/page-auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ExamClient } from "./_components/exam-client";

type Params = { params: Promise<{ slug: string; examId: string }> };

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
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!exam || exam.course.slug !== slug) {
    notFound();
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
      questions={exam.questions.map((q) => ({
        id: q.id,
        type: q.type as "SCQ" | "MCQ" | "SKETCH" | "NUMERIC",
        category: q.category,
        prompt: q.prompt,
        options: (q.options as string[]) ?? [],
        imageUrl: q.imageUrl,
        referenceImage: q.referenceImage,
        points: q.points,
      }))}
      studentName={student?.name?.trim() || auth.email.split("@")[0] || "Student"}
      studentEmail={student?.email || auth.email}
      studentPhone={student?.phone || "Phone not provided"}
    />
  );
}
