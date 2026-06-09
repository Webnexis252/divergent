import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiCreated, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { CreateTestQuestionGroupSchema } from '@/lib/validators';

type Params = { params: Promise<{ sectionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { sectionId } = await params;
    const body = await req.json();

    const parsed = CreateTestQuestionGroupSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const { title, content, imageUrl, order } = parsed.data;

    let finalOrder = order;
    if (finalOrder === undefined) {
      const lastGroup = await prisma.testQuestionGroup.findFirst({
        where: { sectionId },
        orderBy: { order: 'desc' },
      });
      finalOrder = lastGroup ? lastGroup.order + 1 : 0;
    }

    const group = await prisma.testQuestionGroup.create({
      data: {
        sectionId,
        title,
        content,
        imageUrl,
        order: finalOrder,
      },
    });

    return apiCreated(group, 'Question group created successfully');
  } catch (err) {
    console.error('[CREATE_TEST_GROUP_ERROR]', err);
    return apiServerError();
  }
}
