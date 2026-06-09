import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { CreateTestPartSchema } from '@/lib/validators';

type Params = { params: Promise<{ partId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { partId } = await params;
    const body = await req.json();

    const parsed = CreateTestPartSchema.partial().safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const part = await prisma.testPart.update({
      where: { id: partId },
      data: parsed.data,
    });

    return apiSuccess(part, 'Test part updated successfully');
  } catch (err) {
    console.error('[UPDATE_TEST_PART_ERROR]', err);
    return apiServerError();
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { partId } = await params;

    await prisma.testPart.delete({
      where: { id: partId },
    });

    return apiSuccess(null, 'Test part deleted successfully');
  } catch (err) {
    console.error('[DELETE_TEST_PART_ERROR]', err);
    return apiServerError();
  }
}
