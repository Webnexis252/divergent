import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiBadRequest,
  apiForbidden,
  apiServerError,
  apiSuccess,
} from '@/lib/api-response';
import { logAudit } from '@/lib/audit-logger';
import { spendStudentXp } from '@/lib/xp';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Only admins can adjust student XP');

    const body = await req.json();
    const { studentIds, direction } = body;
    const amountValue = Number(body?.amount);
    const note =
      typeof body?.note === 'string' && body.note.trim().length > 0
        ? body.note.trim().slice(0, 240)
        : null;

    if (!Array.isArray(studentIds) && studentIds !== 'ALL') {
      return apiBadRequest('studentIds must be an array of ids or "ALL"');
    }
    
    if (Array.isArray(studentIds) && studentIds.length === 0) {
      return apiBadRequest('studentIds array cannot be empty');
    }

    if (direction !== 'ADD' && direction !== 'REMOVE') {
      return apiBadRequest('direction must be either ADD or REMOVE');
    }

    if (!Number.isInteger(amountValue) || amountValue <= 0) {
      return apiBadRequest('amount must be a positive whole number');
    }

    // Get the actual students that match
    const whereClause = studentIds === 'ALL' 
        ? { role: 'STUDENT' as const } 
        : { id: { in: studentIds }, role: 'STUDENT' as const };
        
    const students = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, name: true, xpPoints: true },
    });

    if (students.length === 0) {
      return apiBadRequest('No matching students found');
    }

    let successCount = 0;
    const delta = direction === 'ADD' ? amountValue : -amountValue;

    if (direction === 'ADD') {
      // We can use updateMany for ADD since it's just incrementing
      const result = await prisma.user.updateMany({
        where: whereClause,
        data: {
          xpPoints: { increment: amountValue },
        },
      });
      successCount = result.count;
      
      // Log audit for each
      for (const student of students) {
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
            newXp: student.xpPoints + amountValue,
            isBulk: true,
          },
        });
      }
    } else {
      // REMOVE requires checking minimum balance and updating individually
      for (const student of students) {
        if (student.xpPoints >= amountValue) {
          const updated = await spendStudentXp(student.id, amountValue);
          if (updated) {
            successCount++;
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
                newXp: student.xpPoints - amountValue,
                isBulk: true,
              },
            });
          }
        }
      }
    }

    return apiSuccess(
      {
        processedCount: successCount,
        totalAttempted: students.length,
        delta,
        note,
      },
      direction === 'ADD'
        ? `Added ${amountValue} XP to ${successCount} student${successCount === 1 ? '' : 's'}.`
        : `Removed ${amountValue} XP from ${successCount} student${successCount === 1 ? '' : 's'}.`,
    );
  } catch (err) {
    console.error('[ADMIN_BULK_XP_POST_ERROR]', err);
    return apiServerError();
  }
}
