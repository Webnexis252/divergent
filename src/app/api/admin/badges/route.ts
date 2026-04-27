import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateBadgeSchema } from '@/lib/validators';
import { apiSuccess, apiCreated, apiError, apiForbidden, apiServerError } from '@/lib/api-response';

export async function GET() {
  try {
    const badges = await prisma.achievementBadge.findMany({
      orderBy: { xpReward: 'asc' },
    });
    return apiSuccess(badges);
  } catch (err) {
    console.error('[GET_BADGES_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can create badges');

    const body = await req.json();
    const parsed = CreateBadgeSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const badge = await prisma.achievementBadge.create({
      data: parsed.data,
    });

    return apiCreated(badge, 'Badge created successfully');
  } catch (err) {
    console.error('[CREATE_BADGE_ERROR]', err);
    return apiServerError();
  }
}
