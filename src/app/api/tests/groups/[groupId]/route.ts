import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { CreateTestQuestionGroupSchema } from '@/lib/validators';

type Params = { params: Promise<{ groupId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { groupId } = await params;
    const body = await req.json();

    const parsed = CreateTestQuestionGroupSchema.partial().safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const group = await prisma.testQuestionGroup.update({
      where: { id: groupId },
      data: parsed.data,
    });

    return apiSuccess(group, 'Question group updated successfully');
  } catch (err) {
    console.error('[UPDATE_TEST_GROUP_ERROR]', err);
    return apiServerError();
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { groupId } = await params;

    await prisma.testQuestionGroup.delete({
      where: { id: groupId },
    });

    return apiSuccess(null, 'Question group deleted successfully');
  } catch (err) {
    console.error('[DELETE_TEST_GROUP_ERROR]', err);
    return apiServerError();
  }
}
