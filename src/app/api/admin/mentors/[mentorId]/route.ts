import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiForbidden, apiNotFound, apiError, apiServerError } from '@/lib/api-response';

type Params = Promise<{ mentorId: string }>;

/**
 * PATCH /api/admin/mentors/[mentorId]
 * Suspends a teacher account, or creates a suspension request for Super Admin approval.
 */
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { mentorId } = await params;
    const body = await req.json();
    const { status } = body;

    if (status !== 'SUSPENDED') {
      return apiError('Invalid status update', 400);
    }

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, name: true, email: true, role: true, mentorStatus: true },
    });
    if (!teacher) return apiNotFound('Teacher');

    // Prevent suspending SUPER_ADMINs
    if (teacher.role === 'SUPER_ADMIN') {
      return apiForbidden('Cannot suspend Super Admins');
    }

    if (teacher.mentorStatus === 'SUSPENDED') {
      return apiError('Teacher is already suspended', 400);
    }

    // If Admin tries to suspend the account
    if (auth.role === 'ADMIN') {
      await prisma.teacherApprovalRequest.create({
        data: {
          type: 'SUSPEND',
          targetUserId: teacher.id,
          name: teacher.name || 'Unknown',
          email: teacher.email || 'unknown@example.com',
          requestedBy: auth.userId,
          status: 'PENDING',
        },
      });
      return apiSuccess({ teacherId: mentorId, status: 'PENDING_APPROVAL' }, 'Suspension request sent to Super Admin');
    }

    // If Super Admin, suspend immediately
    await prisma.user.update({
      where: { id: mentorId },
      data: { mentorStatus: 'SUSPENDED' },
    });

    return apiSuccess({ teacherId: mentorId }, 'Teacher account suspended successfully');
  } catch (err) {
    console.error('[SUSPEND_TEACHER_ERROR]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/admin/mentors/[mentorId]
 * Deletes a teacher account, or creates a deletion request for Super Admin approval.
 */
export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { mentorId } = await params;

    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!teacher) return apiNotFound('Teacher');

    // Prevent deleting SUPER_ADMINs
    if (teacher.role === 'SUPER_ADMIN') {
      return apiForbidden('Cannot delete Super Admins');
    }

    // If Admin tries to delete the account
    if (auth.role === 'ADMIN') {
      await prisma.teacherApprovalRequest.create({
        data: {
          type: 'DELETE',
          targetUserId: teacher.id,
          name: teacher.name || 'Unknown',
          email: teacher.email || 'unknown@example.com',
          requestedBy: auth.userId,
          status: 'PENDING',
        },
      });
      return apiSuccess({ teacherId: mentorId, status: 'PENDING_APPROVAL' }, 'Deletion request sent to Super Admin');
    }

    // If Super Admin, delete immediately
    await prisma.user.delete({
      where: { id: mentorId },
    });

    return apiSuccess({ teacherId: mentorId }, 'Teacher account deleted successfully');
  } catch (err) {
    console.error('[DELETE_TEACHER_ERROR]', err);
    return apiServerError();
  }
}
