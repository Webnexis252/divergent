import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiCreated, apiError, apiForbidden, apiServerError } from '@/lib/api-response';
import { CreateTestPartSchema } from '@/lib/validators';

type Params = { params: Promise<{ testId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiForbidden('Authentication required');

    const { testId } = await params;
    const parts = await prisma.testPart.findMany({
      where: { testId },
      include: {
        sections: {
          include: {
            groups: true,
            questions: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return apiSuccess(parts);
  } catch (err) {
    console.error('[GET_TEST_PARTS_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const { testId } = await params;
    const body = await req.json();

    const parsed = CreateTestPartSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const { title, durationMins, order } = parsed.data;

    let finalOrder = order;
    if (finalOrder === undefined) {
      const lastPart = await prisma.testPart.findFirst({
        where: { testId },
        orderBy: { order: 'desc' },
      });
      finalOrder = lastPart ? lastPart.order + 1 : 0;
    }

    const part = await prisma.testPart.create({
      data: {
        testId,
        title,
        durationMins,
        order: finalOrder,
      },
    });

    return apiCreated(part, 'Test part created successfully');
  } catch (err) {
    console.error('[CREATE_TEST_PART_ERROR]', err);
    return apiServerError();
  }
}
