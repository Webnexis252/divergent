import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiCreated, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { CreateTestSectionSchema } from '@/lib/validators';

type Params = { params: Promise<{ partId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { partId } = await params;
    const body = await req.json();

    const parsed = CreateTestSectionSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const { title, questionType, order } = parsed.data;

    let finalOrder = order;
    if (finalOrder === undefined) {
      const lastSection = await prisma.testSection.findFirst({
        where: { partId },
        orderBy: { order: 'desc' },
      });
      finalOrder = lastSection ? lastSection.order + 1 : 0;
    }

    const section = await prisma.testSection.create({
      data: {
        partId,
        title,
        questionType,
        order: finalOrder,
      },
    });

    return apiCreated(section, 'Test section created successfully');
  } catch (err) {
    console.error('[CREATE_TEST_SECTION_ERROR]', err);
    return apiServerError();
  }
}
