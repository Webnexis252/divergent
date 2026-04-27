import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { apiSuccess, apiCreated } from '@/lib/api-response';
import { withApiHandler } from '@/lib/api-handler';
import { z } from 'zod';

const AnnouncementSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(10),
  targetRole: z.enum(['STUDENT', 'MENTOR', 'ADMIN', 'SUPER_ADMIN']).optional(),
  targetCourseId: z.string().optional(),
  isPinned: z.boolean().default(false),
});

/**
 * GET /api/admin/announcements
 */
export const GET = withApiHandler({ allowedRoles: ['ADMIN', 'SUPER_ADMIN'] }, async () => {
  const announcements = await prisma.announcement.findMany({
    include: { author: { select: { name: true, image: true } } },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return apiSuccess(announcements);
});

/**
 * POST /api/admin/announcements
 * Create an announcement targeting all or specific roles/courses.
 */
export const POST = withApiHandler(
  { allowedRoles: ['ADMIN', 'SUPER_ADMIN'], schema: AnnouncementSchema },
  async (_, { user, parsedBody }) => {
    const announcement = await prisma.announcement.create({
      data: {
        title: parsedBody.title,
        body: parsedBody.body,
        targetRole: parsedBody.targetRole ?? null,
        targetCourseId: parsedBody.targetCourseId ?? null,
        isPinned: parsedBody.isPinned,
        authorId: user!.userId,
      },
    });

    return apiCreated(announcement, 'Announcement created');
  }
);
