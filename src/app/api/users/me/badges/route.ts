import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-response';

/**
 * GET /api/users/me/badges
 * Returns all badges with earned status for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    // Get all badges
    const allBadges = await prisma.achievementBadge.findMany({
      orderBy: { xpReward: 'asc' },
    });

    // Get user's earned badges
    const earnedBadges = await prisma.userAchievement.findMany({
      where: { userId: auth.userId },
      select: { badgeId: true, earnedAt: true },
    });

    const earnedMap = new Map(
      earnedBadges.map((eb) => [eb.badgeId, eb.earnedAt]),
    );

    // Get user XP
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { xpPoints: true },
    });

    const badges = allBadges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      imageUrl: badge.imageUrl,
      xpReward: badge.xpReward,
      earned: earnedMap.has(badge.id),
      earnedAt: earnedMap.get(badge.id)?.toISOString() ?? null,
    }));

    return apiSuccess({
      badges,
      totalXP: user?.xpPoints ?? 0,
      earnedCount: earnedBadges.length,
      totalCount: allBadges.length,
    });
  } catch (err) {
    console.error('[GET_MY_BADGES_ERROR]', err);
    return apiServerError();
  }
}
