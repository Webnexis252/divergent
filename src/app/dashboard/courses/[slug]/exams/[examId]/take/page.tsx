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
      parts: {
        orderBy: { order: 'asc' },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              groups: { orderBy: { order: 'asc' } },
              questions: { orderBy: { order: 'asc' } },
            }
          }
        }
      }
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
      parts={exam.parts}
      studentName={student?.name?.trim() || auth.email.split("@")[0] || "Student"}
      studentEmail={student?.email || auth.email}
      studentPhone={student?.phone || "Phone not provided"}
    />
  );
}
