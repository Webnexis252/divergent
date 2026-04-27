import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateAssignmentSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

/**
 * GET /api/teacher/assignments
 * MENTOR sees only assignments for courses they teach.
 * ADMIN / SUPER_ADMIN sees everything (read-only overview).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Unauthorized');

    const whereClause: Prisma.AssignmentWhereInput = {};

    // Scope MENTORs to their own courses
    if (user.role === 'MENTOR') {
      const teacherCourses = await prisma.course.findMany({
        where: { teachers: { some: { id: user.userId } } },
        select: { id: true },
      });
      const courseIds = teacherCourses.map((c) => c.id);
      whereClause.courseId = { in: courseIds };
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        course: { select: { title: true } },
        submissions: { select: { id: true, score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ assignments });
  } catch (err) {
    console.error('[GET_TEACHER_ASSIGNMENTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/teacher/assignments
 * Only MENTORs can create assignments, and only for courses they teach.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR']);
    if (!user) return apiForbidden('Only teachers can create assignments');

    const body = await req.json();
    const parsed = CreateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const { title, description, deadline, points, courseId, attachmentUrl } = parsed.data;

    // Verify the teacher actually teaches this course
    if (courseId) {
      const course = await prisma.course.findFirst({
        where: { id: courseId, teachers: { some: { id: user.userId } } },
      });
      if (!course) {
        return apiForbidden('You can only create assignments for courses you teach');
      }
    } else {
      return apiError('courseId is required — choose a course you teach', 400);
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        points,
        courseId,
        status: 'ACTIVE',
        attachmentUrl: attachmentUrl ?? null,
      },
    });

    // Create a notification for all students enrolled in this course
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: { userId: true },
    });

    if (enrollments.length > 0) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { title: true },
      });

      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: `New Assignment: ${title}`,
          body: `A new assignment has been posted in ${course?.title ?? 'your course'}. Submit before the deadline!`,
          type: 'INFO',
          actionUrl: `/dashboard/assignments`,
        })),
      });
    }

    return apiCreated(assignment, 'Assignment created successfully');
  } catch (err) {
    console.error('[CREATE_ASSIGNMENT_ERROR]', err);
    return apiServerError();
  }
}
