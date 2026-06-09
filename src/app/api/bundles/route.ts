import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiServerError, apiSuccess } from '@/lib/api-response';

/**
 * GET /api/bundles
 * List all published bundles for students to browse.
 */
export async function GET(_req: NextRequest) {
  try {
    const bundles = await (prisma as any).bundle.findMany({
      where: { isPublished: true },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                thumbnail: true,
                price: true,
                totalHours: true,
                lessonCount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(bundles);
  } catch (err) {
    console.error('[BUNDLES_GET]', err);
    return apiServerError();
  }
}
