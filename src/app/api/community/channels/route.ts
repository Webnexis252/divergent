import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CreateChannelSchema } from '@/lib/validators';
import { apiSuccess, apiCreated, apiError, apiForbidden, apiUnauthorized, apiServerError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const channels = await prisma.channel.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return apiSuccess(channels);
  } catch (err) {
    console.error('[GET_CHANNELS_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'MENTOR']);
    if (!user) return apiForbidden('Only admins and mentors can create channels');

    const body = await req.json();
    const parsed = CreateChannelSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    const channel = await prisma.channel.create({ data: parsed.data });
    return apiCreated(channel, 'Channel created successfully');
  } catch (err) {
    console.error('[CREATE_CHANNEL_ERROR]', err);
    return apiServerError();
  }
}
