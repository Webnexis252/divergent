import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { CreateMessageSchema } from '@/lib/validators';
import { apiCreated, apiError, apiUnauthorized, apiNotFound, apiServerError, apiSuccess } from '@/lib/api-response';
import { enqueueMessage, checkRateLimit, getCachedChannel } from '@/lib/community-queue';
import prisma from '@/lib/prisma';

type Params = { params: Promise<{ channelId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    const { channelId } = await params;
    const channel = await getCachedChannel(channelId);
    if (!channel) return apiNotFound('Channel');

    const messages = await prisma.message.findMany({
      where: { channelId },
      include: { author: { select: { id: true, name: true, role: true, image: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return apiSuccess(messages);
  } catch (err) {
    console.error('[GET_MESSAGES_ERROR]', err);
    return apiServerError();
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiUnauthorized();

    // 1. Rate Limit Check
    if (!checkRateLimit(user.userId)) {
      return apiError('Too many messages. Please wait a few seconds.', 429);
    }

    const { channelId } = await params;
    const channel = await getCachedChannel(channelId);
    if (!channel) return apiNotFound('Channel');

    if (channel.type === 'ANNOUNCEMENT' && user.role === 'STUDENT') {
      return apiError('Students cannot post in announcement channels', 403);
    }

    const body = await req.json();
    const parsed = CreateMessageSchema.safeParse(body);
    if (!parsed.success) return apiError('Validation failed', 400, parsed.error.flatten());

    // 2. Enqueue for batch insert
    const message = await enqueueMessage({
      channelId,
      authorId: user.userId,
      body: parsed.data.body,
      attachmentUrl: parsed.data.attachmentUrl,
    });

    return apiCreated(message, 'Message sent');
  } catch (err) {
    console.error('[CREATE_MESSAGE_ERROR]', err);
    return apiServerError();
  }
}
