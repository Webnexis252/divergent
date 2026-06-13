import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ courseId: string }> };

/**
 * GET /api/admin/courses/[courseId]/assignments
 * Lists all assignments for a specific course. Admin/Super Admin only.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });
    if (!course) return apiNotFound('Course');

    const assignments = await prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        points: true,
        status: true,
        attachmentUrl: true,
        createdAt: true,
        _count: { select: { submissions: true } },
      },
    });

    return apiSuccess(assignments);
  } catch (err) {
    console.error('[ADMIN_COURSE_ASSIGNMENTS_GET_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/admin/courses/[courseId]/assignments
 * Creates a new assignment for the specified course. Admin/Super Admin only.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) return apiNotFound('Course');

    const body = await req.json();
    const { title, description, deadline, points, attachmentUrl } = body;

    if (!title?.trim()) return apiError('Title is required', 400);

    const assignment = await prisma.assignment.create({
      data: {
        courseId,
        title: title.trim(),
        description: description?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        points: points ? Number(points) : 0,
        status: 'ACTIVE',
        attachmentUrl: attachmentUrl?.trim() || null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        points: true,
        status: true,
        attachmentUrl: true,
        createdAt: true,
        _count: { select: { submissions: true } },
      },
    });

    // Notify enrolled students
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: { userId: true },
    });
    if (enrollments.length > 0) {
      await prisma.notification.createMany({
        data: enrollments.map((e) => ({
          userId: e.userId,
          title: `New Assignment: ${title}`,
          body: `A new assignment has been posted in ${course.title}. Submit before the deadline!`,
          type: 'INFO' as const,
          actionUrl: `/dashboard/assignments`,
        })),
      });
    }

    return apiCreated(assignment, 'Assignment created successfully');
  } catch (err) {
    console.error('[ADMIN_COURSE_ASSIGNMENTS_POST_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/admin/courses/[courseId]/assignments?assignmentId=xxx
 * Deletes an assignment. Admin/Super Admin only.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { courseId } = await params;
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) return apiError('assignmentId is required', 400);

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, courseId },
      select: { id: true },
    });
    if (!assignment) return apiNotFound('Assignment');

    await prisma.assignment.delete({ where: { id: assignmentId } });

    return apiSuccess(null, 'Assignment deleted');
  } catch (err) {
    console.error('[ADMIN_COURSE_ASSIGNMENTS_DELETE_ERROR]', err);
    return apiServerError();
  }
}
