import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { apiSuccess, apiUnauthorized, apiServerError, apiCreated } from '@/lib/api-response';
import { NextRequest } from 'next/server';

/**
 * GET /api/student/certificates
 * Returns all certificates earned by the authenticated student.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const certs = await prisma.certificate.findMany({
      where: { userId: auth.userId },
      include: {
        course: { select: { id: true, title: true, thumbnail: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return apiSuccess(certs);
  } catch (err) {
    console.error('[CERTIFICATES_ERROR]', err);
    return apiServerError();
  }
}

/**
 * POST /api/student/certificates
 * Auto-issue a certificate when a student completes a course (100% progress).
 * Called internally when enrollment progress hits 100%.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiUnauthorized();

    const { courseId } = await req.json();

    // Verify enrollment at 100%
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: auth.userId, courseId } },
    });

    if (!enrollment || enrollment.progressPercent < 100) {
      return apiSuccess({ issued: false, message: 'Course not yet completed.' });
    }

    // Upsert cert (safe to call multiple times)
    const cert = await prisma.certificate.upsert({
      where: { userId_courseId: { userId: auth.userId, courseId } },
      update: {},
      create: { userId: auth.userId, courseId },
      include: { course: { select: { title: true } } },
    });

    return apiCreated({ issued: true, certificate: cert });
  } catch (err) {
    console.error('[ISSUE_CERTIFICATE_ERROR]', err);
    return apiServerError();
  }
}
