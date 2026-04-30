import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyToken } from '@/lib/auth';
import { CreateCourseSchema } from '@/lib/validators';
import {
  apiSuccess,
  apiCreated,
  apiError,
  apiForbidden,
  apiServerError,
} from '@/lib/api-response';

const courseTeacherSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

/**
 * GET /api/courses
 * Public: Returns published courses with chapter count.
 * Admins can also see drafts.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyToken(req);
    const canViewDrafts = auth?.role === 'ADMIN' || auth?.role === 'SUPER_ADMIN';

    const courses = await prisma.course.findMany({
      where: canViewDrafts ? undefined : { isPublished: true },
      include: {
        _count: { select: { chapters: true, enrollments: true } },
        teachers: { select: courseTeacherSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
    return apiSuccess(courses);
  } catch (err) {
    console.error('[GET_COURSES_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/courses
 * Admin only: Create a new course.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN']);
    if (!user) return apiForbidden('Only admins can create courses');

    const body = await req.json();
    const parsed = CreateCourseSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Validation failed', 400, parsed.error.flatten());
    }

    const { 
      title, 
      subtitle,
      description, 
      overviewContent,
      thumbnail, 
      price, 
      teacherIds,
      totalHours,
      lessonCount,
      courseRating,
      autoCalculateRating,
      enrolledStudents,
      autoUpdateEnrolled,
      learningOutcomes,
      features,
      testimonials,
      faqs,
      category,
      courseLevel,
      language,
      visibility,
      pricingType,
      publishDate
    } = parsed.data;

    // Generate a URL-friendly slug from the title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) {
      return apiError('A course with a similar title already exists. Please use a unique title.', 409);
    }

    if (teacherIds && teacherIds.length > 0) {
      const validTeachers = await prisma.user.count({
        where: {
          id: { in: teacherIds },
          role: { in: ['MENTOR', 'ADMIN', 'SUPER_ADMIN'] },
        },
      });

      if (validTeachers !== teacherIds.length) {
        return apiError('One or more selected teachers were not found or are not eligible for courses.', 400);
      }
    }

    const course = await prisma.course.create({
      data: { 
        title, 
        subtitle,
        slug, 
        description, 
        overviewContent,
        thumbnail: thumbnail || null, 
        price, 
        totalHours,
        lessonCount,
        courseRating,
        autoCalculateRating,
        enrolledStudents,
        autoUpdateEnrolled,
        learningOutcomes: learningOutcomes ? JSON.parse(JSON.stringify(learningOutcomes)) : undefined,
        features: features ? JSON.parse(JSON.stringify(features)) : undefined,
        testimonials: testimonials ? JSON.parse(JSON.stringify(testimonials)) : undefined,
        faqs: faqs ? JSON.parse(JSON.stringify(faqs)) : undefined,
        category,
        courseLevel,
        language,
        visibility,
        pricingType,
        publishDate: publishDate ? new Date(publishDate) : undefined,
        teachers: teacherIds && teacherIds.length > 0 ? { connect: teacherIds.map(id => ({ id })) } : undefined
      },
      include: {
        _count: { select: { chapters: true, enrollments: true } },
        teachers: { select: courseTeacherSelect },
      },
    });

    return apiCreated(course, 'Course created successfully');
  } catch (err) {
    console.error('[CREATE_COURSE_ERROR]', err);
    return apiServerError();
  }
}
