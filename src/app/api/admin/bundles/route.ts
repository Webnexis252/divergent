import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  apiBadRequest,
  apiCreated,
  apiForbidden,
  apiServerError,
  apiSuccess,
} from '@/lib/api-response';

/**
 * GET /api/admin/bundles
 * List all bundles with their courses and purchase counts.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const bundles = await prisma.bundle.findMany({
      include: {
        courses: {
          include: {
            course: { select: { id: true, title: true, thumbnail: true, price: true } },
          },
        },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiSuccess(bundles);
  } catch (err) {
    console.error('[ADMIN_BUNDLES_GET]', err);
    return apiServerError();
  }
}

/**
 * POST /api/admin/bundles
 * Create a new bundle.
 * Body: { title, description?, thumbnail?, price, courseIds: string[], isPublished? }
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!auth) return apiForbidden('Admin access required');

    const body = await req.json();
    const { title, description, thumbnail, price, courseIds, isPublished } = body;

    if (!title?.trim()) return apiBadRequest('title is required');
    const hasCoursesArray = Array.isArray(body.courses) && body.courses.length >= 2;
    const hasCourseIds = Array.isArray(courseIds) && courseIds.length >= 2;
    if (!hasCoursesArray && !hasCourseIds)
      return apiBadRequest('A bundle must include at least 2 courses');
    if (typeof price !== 'number' || price < 0)
      return apiBadRequest('price must be a non-negative number');

    // Generate slug from title
    const slug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      Date.now();

    // Build the courses create array using proper relational syntax
    const coursesToCreate = courseIds
      ? courseIds.map((cId: string) => ({
          course: { connect: { id: cId } },
        }))
      : body.courses.map((c: any) => {
          const entry: any = {
            course: { connect: { id: c.courseId } },
          };
          if (Array.isArray(c.teacherIds) && c.teacherIds.length > 0) {
            entry.teachers = {
              connect: c.teacherIds.map((tId: string) => ({ id: tId })),
            };
          }
          return entry;
        });

    const bundle = await prisma.bundle.create({
      data: {
        title: title.trim(),
        slug,
        description: description?.trim() ?? null,
        thumbnail: thumbnail ?? null,
        price,
        isPublished: isPublished ?? false,
        courses: {
          create: coursesToCreate,
        },
      },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
      },
    });

    return apiCreated(bundle);
  } catch (err) {
    console.error('[ADMIN_BUNDLES_POST]', err);
    return apiServerError();
  }
}

