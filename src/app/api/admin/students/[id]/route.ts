import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiSuccess,
  apiForbidden,
  apiNotFound,
  apiError,
  apiServerError,
} from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/students/[id]
 * Admin/Super Admin: update an enrollment status for a student.
 * Body: { courseId, status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' }
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { id } = await params;
    const body = await req.json();
    const { courseId, status } = body as { courseId?: string; status?: string };

    const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED', 'SUSPENDED'];
    if (!status || !validStatuses.includes(status)) {
      return apiError('Invalid status. Must be ACTIVE, PAUSED, CANCELLED, COMPLETED, or SUSPENDED', 400);
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
      select: { id: true, name: true, email: true },
    });
    if (!student) return apiNotFound('Student');

    // If Admin tries to suspend the entire account
    if (status === 'SUSPENDED' && !courseId && auth.role === 'ADMIN') {
      await prisma.studentApprovalRequest.create({
        data: {
          type: 'SUSPEND',
          targetUserId: student.id,
          name: student.name || 'Unknown',
          email: student.email || 'unknown@example.com',
          requestedBy: auth.id,
          status: 'PENDING',
        },
      });
      return apiSuccess({ studentId: id, status: 'PENDING_APPROVAL' }, 'Suspension request sent to Super Admin');
    }

    // Map SUSPENDED to PAUSED for the database
    const dbStatus = status === 'SUSPENDED' ? 'PAUSED' : status;

    if (courseId) {
      // Update specific enrollment status
      const enrollment = await prisma.enrollment.findFirst({
        where: { userId: id, courseId },
      });
      if (!enrollment) return apiNotFound('Enrollment');

      const updated = await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { status: dbStatus as 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' },
        include: { course: { select: { title: true } } },
      });

      return apiSuccess(updated, 'Enrollment status updated');
    } else {
      // Update ALL enrollments for the student (e.g., suspend student)
      await prisma.enrollment.updateMany({
        where: { userId: id },
        data: { status: dbStatus as 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED' },
      });

      return apiSuccess({ studentId: id, status: dbStatus }, 'All enrollments updated');
    }
  } catch (err) {
    console.error('[PATCH_STUDENT_STATUS_ERROR]', err);
    return apiServerError();
  }
}

/**
 * GET /api/admin/students/[id]
 * Fetch a single student's full profile for the admin detail view.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { id } = await params;

    const student = await prisma.user.findUnique({
      where: { id, role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        streakCount: true,
        xpPoints: true,
        totalStudyTime: true,
        enrollments: {
          include: {
            course: { select: { id: true, title: true, thumbnail: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        testAttempts: {
          include: { test: { select: { title: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        assignmentSubmissions: {
          include: { assignment: { select: { title: true } } },
          orderBy: { submittedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!student) return apiNotFound('Student');

    return apiSuccess(student);
  } catch (err) {
    console.error('[GET_STUDENT_DETAIL_ERROR]', err);
    return apiServerError();
  }
}
