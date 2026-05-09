import prisma from '@/lib/prisma';
import { apiSuccess, apiCreated, apiBadRequest } from '@/lib/api-response';
import { withApiHandler } from '@/lib/api-handler';
import { z } from 'zod';

const AnnouncementSchema = z.object({
  title: z.string().min(3),
  body: z.string().min(10),
  targetRole: z.enum(['STUDENT', 'MENTOR', 'ADMIN', 'SUPER_ADMIN']).optional(),
  targetCourseId: z.string().optional(),
  selectedStudentIds: z.array(z.string().min(1)).max(100).optional(),
  isPinned: z.boolean().default(false),
}).superRefine((value, ctx) => {
  if ((value.selectedStudentIds?.length ?? 0) > 0 && (value.targetRole || value.targetCourseId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Selected students cannot be combined with role or course targeting',
      path: ['selectedStudentIds'],
    });
  }
});

const announcementInclude = {
  author: { select: { name: true, image: true } },
  recipients: {
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 5,
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  _count: {
    select: { recipients: true },
  },
} as const;

/**
 * GET /api/admin/announcements
 */
export const GET = withApiHandler({ allowedRoles: ['ADMIN', 'SUPER_ADMIN'] }, async () => {
  const announcements = await prisma.announcement.findMany({
    include: announcementInclude,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  });

  return apiSuccess(announcements);
});

/**
 * POST /api/admin/announcements
 * Create an announcement targeting everyone, a specific role, or selected students.
 */
export const POST = withApiHandler(
  { allowedRoles: ['ADMIN', 'SUPER_ADMIN'], schema: AnnouncementSchema },
  async (_, { user, parsedBody }) => {
    const selectedStudentIds = [...new Set(parsedBody.selectedStudentIds ?? [])];

    if (selectedStudentIds.length > 0) {
      const students = await prisma.user.findMany({
        where: {
          id: { in: selectedStudentIds },
          role: 'STUDENT',
        },
        select: { id: true },
      });

      if (students.length !== selectedStudentIds.length) {
        return apiBadRequest('One or more selected students could not be found');
      }
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: parsedBody.title,
        body: parsedBody.body,
        targetRole: parsedBody.targetRole ?? null,
        targetCourseId: parsedBody.targetCourseId ?? null,
        isPinned: parsedBody.isPinned,
        authorId: user!.userId,
        recipients: selectedStudentIds.length > 0
          ? {
              createMany: {
                data: selectedStudentIds.map((studentId) => ({ userId: studentId })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: announcementInclude,
    });

    return apiCreated(announcement, 'Announcement created');
  }
);
