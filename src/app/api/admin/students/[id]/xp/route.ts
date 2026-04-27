import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiBadRequest,
  apiError,
  apiForbidden,
  apiNotFound,
  apiServerError,
  apiSuccess,
} from '@/lib/api-response';
import { logAudit } from '@/lib/audit-logger';
import { spendStudentXp } from '@/lib/xp';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['SUPER_ADMIN']);
    if (!auth) return apiForbidden('Only super admins can adjust student XP');

    const { id } = await params;
    const body = await req.json();
    const direction = body?.direction;
    const amountValue = Number(body?.amount);
    const note =
      typeof body?.note === 'string' && body.note.trim().length > 0
        ? body.note.trim().slice(0, 240)
        : null;

    if (direction !== 'ADD' && direction !== 'REMOVE') {
      return apiBadRequest('direction must be either ADD or REMOVE');
    }

    if (!Number.isInteger(amountValue) || amountValue <= 0) {
      return apiBadRequest('amount must be a positive whole number');
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, xpPoints: true },
    });

    if (!student || student.role !== 'STUDENT') {
      return apiNotFound('Student');
    }

    if (direction === 'REMOVE' && student.xpPoints < amountValue) {
      return apiError(
        `${student.name ?? 'This student'} only has ${student.xpPoints} XP available.`,
        400,
      );
    }

    const delta = direction === 'ADD' ? amountValue : -amountValue;
    let updated = false;

    if (direction === 'ADD') {
      const result = await prisma.user.updateMany({
        where: {
          id: student.id,
          role: 'STUDENT',
        },
        data: {
          xpPoints: { increment: amountValue },
        },
      });
      updated = result.count > 0;
    } else {
      updated = await spendStudentXp(student.id, amountValue);
    }

    const updatedStudent = updated
      ? await prisma.user.findUnique({
          where: { id: student.id },
          select: {
            id: true,
            name: true,
            xpPoints: true,
          },
        })
      : null;

    if (!updatedStudent) {
      return apiError('Could not update the XP balance for this student.', 400);
    }

    await logAudit({
      actorId: auth.userId,
      action: 'STUDENT_XP_ADJUSTED',
      entityType: 'User',
      entityId: student.id,
      details: {
        amount: amountValue,
        direction,
        note,
        previousXp: student.xpPoints,
        newXp: updatedStudent.xpPoints,
      },
    });

    return apiSuccess(
      {
        studentId: student.id,
        studentName: updatedStudent.name,
        xpPoints: updatedStudent.xpPoints,
        delta,
        note,
      },
      direction === 'ADD'
        ? `Added ${amountValue} XP to ${updatedStudent.name ?? 'the student'}.`
        : `Removed ${amountValue} XP from ${updatedStudent.name ?? 'the student'}.`,
    );
  } catch (err) {
    console.error('[SUPER_ADMIN_STUDENT_XP_POST_ERROR]', err);
    return apiServerError();
  }
}
