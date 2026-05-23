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
 * GET /api/admin/assignments
 * Returns ALL assignments across all courses with full submission counts.
 * Optional query params: ?courseId= ?status= ?search=
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Admin access required');

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId') ?? undefined;
    const status   = searchParams.get('status') ?? undefined;
    const search   = searchParams.get('search') ?? undefined;

    const where: Prisma.AssignmentWhereInput = {};
    if (courseId) where.courseId = courseId;
    if (status && ['DRAFT', 'ACTIVE', 'CLOSED'].includes(status)) {
      where.status = status as 'DRAFT' | 'ACTIVE' | 'CLOSED';
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        submissions: { select: { id: true, score: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess({ assignments });
  } catch (err) {
    console.error('[GET_ADMIN_ASSIGNMENTS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/admin/assignments
 * Admins/Super Admins can create assignments for any course.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Admin access required');

    const body = await req.json();
    const parsed = CreateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const { title, description, deadline, points, courseId, attachmentUrl } = parsed.data;

    if (!courseId) return apiError('courseId is required', 400);

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });
    if (!course) return apiError('Course not found', 404);

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

    // Notify all active students enrolled in the course
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
    console.error('[ADMIN_CREATE_ASSIGNMENT_ERROR]', err);
    return apiServerError();
  }
}

/**
 * PATCH /api/admin/assignments
 * Update status of an assignment: { assignmentId, status }
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Admin access required');

    const body = await req.json() as { assignmentId: string; status: string };
    if (!body.assignmentId || !body.status) return apiError('assignmentId and status are required', 400);
    if (!['DRAFT', 'ACTIVE', 'CLOSED'].includes(body.status)) return apiError('Invalid status', 400);

    const updated = await prisma.assignment.update({
      where: { id: body.assignmentId },
      data: { status: body.status as 'DRAFT' | 'ACTIVE' | 'CLOSED' },
    });

    return apiSuccess(updated, 'Assignment status updated');
  } catch (err) {
    console.error('[ADMIN_UPDATE_ASSIGNMENT_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/admin/assignments?assignmentId=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Admin access required');

    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    if (!assignmentId) return apiError('assignmentId is required', 400);

    await prisma.assignment.delete({ where: { id: assignmentId } });
    return apiSuccess(null, 'Assignment deleted');
  } catch (err) {
    console.error('[ADMIN_DELETE_ASSIGNMENT_ERROR]', err);
    return apiServerError();
  }
}
