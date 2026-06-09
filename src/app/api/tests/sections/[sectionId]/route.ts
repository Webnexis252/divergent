import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { CreateTestSectionSchema } from '@/lib/validators';

type Params = { params: Promise<{ sectionId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { sectionId } = await params;
    const body = await req.json();

    const parsed = CreateTestSectionSchema.partial().safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const section = await prisma.testSection.update({
      where: { id: sectionId },
      data: parsed.data,
    });

    return apiSuccess(section, 'Test section updated successfully');
  } catch (err) {
    console.error('[UPDATE_TEST_SECTION_ERROR]', err);
    return apiServerError();
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { sectionId } = await params;

    await prisma.testSection.delete({
      where: { id: sectionId },
    });

    return apiSuccess(null, 'Test section deleted successfully');
  } catch (err) {
    console.error('[DELETE_TEST_SECTION_ERROR]', err);
    return apiServerError();
  }
}
