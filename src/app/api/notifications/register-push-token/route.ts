import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyTokenValue } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * POST /api/notifications/register-push-token
 * Registers a device's Expo push token so the server can send targeted
 * push notifications to specific users.
 * Requires Bearer token auth from mobile clients.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify Bearer token from mobile
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return apiUnauthorized('No auth token provided');

    const payload = await verifyTokenValue(token);
    if (!payload) return apiUnauthorized('Invalid token');

    const body = await req.json();
    const { token: pushToken, platform, appType } = body;

    if (!pushToken || typeof pushToken !== 'string') {
      return apiError('Invalid push token', 400);
    }

    if (!pushToken.startsWith('ExponentPushToken[')) {
      return apiError('Invalid Expo push token format', 400);
    }

    // Upsert the push token for this user
    await prisma.pushToken.upsert({
      where: {
        token: pushToken,
      },
      update: {
        userId: payload.userId,
        platform: platform || 'unknown',
        appType: appType || 'student',
        updatedAt: new Date(),
      },
      create: {
        token: pushToken,
        userId: payload.userId,
        platform: platform || 'unknown',
        appType: appType || 'student',
      },
    });

    return apiSuccess({ registered: true }, 'Push token registered');
  } catch (err) {
    console.error('[PUSH_TOKEN_REGISTER]', err);
    return apiServerError();
  }
}

/**
 * DELETE /api/notifications/register-push-token
 * Removes the push token on logout.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return apiUnauthorized();

    const payload = await verifyTokenValue(token);
    if (!payload) return apiUnauthorized();

    const body = await req.json();
    const { token: pushToken } = body;

    if (pushToken) {
      await prisma.pushToken.deleteMany({
        where: { token: pushToken, userId: payload.userId },
      });
    }

    return apiSuccess({ removed: true }, 'Push token removed');
  } catch {
    return apiServerError();
  }
}
