import { NextRequest } from "next/server";
import cashfree from "@/lib/cashfree";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, apiServerError } from "@/lib/api-response";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { order_id, courseId, bundleId } = body;

    if (!order_id || (!courseId && !bundleId)) {
      return apiError('Missing required payment details', 400);
    }

    // Verify order status with Cashfree server
    const response = await cashfree.PGOrderFetchPayments(order_id);

    if (!response?.data) {
      return apiError("Could not verify payment with Cashfree", 400);
    }

    const payments = response.data;

    // Find the successful payment
    const successfulPayment = payments.find(
      (p: { payment_status?: string }) => p.payment_status === "SUCCESS",
    );

    if (!successfulPayment) {
      // Mark payment as failed if no successful payment found
      await prisma.payment.updateMany({
        where: { cashfreeOrderId: order_id },
        data: { status: "FAILED" },
      });
      return apiError("Payment was not successful", 400);
    }

    // Update Payment status to SUCCESS
    await prisma.payment.updateMany({
      where: { cashfreeOrderId: order_id, userId: auth.userId },
      data: {
        status: 'SUCCESS',
        cashfreePaymentId: String(successfulPayment.cf_payment_id || ''),
      },
    });

    if (bundleId) {
      // Enroll user in ALL courses inside the bundle
      const bundleCourses = await (prisma as any).bundleCourse.findMany({
        where: { bundleId },
        select: { courseId: true },
      });
      await Promise.all(bundleCourses.map((bc: { courseId: string }) => ensureActiveEnrollmentWithXp(auth.userId, bc.courseId, 'ACTIVE', true, bundleId)));

      const bundle = await (prisma as any).bundle.findUnique({
        where: { id: bundleId },
        select: { slug: true },
      });
      const redirectUrl = bundle ? `/dashboard/bundles/${bundle.slug}?success=true` : '/dashboard/courses';
      return apiSuccess({ enrolled: true, type: 'bundle', courseCount: bundleCourses.length, redirectUrl });
    }

    // Single course enrollment
    const { enrollment } = await ensureActiveEnrollmentWithXp(auth.userId, courseId);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { slug: true },
    });
    const redirectUrl = course ? `/dashboard/courses/${course.slug}?success=true` : '/dashboard/courses';
    return apiSuccess({ enrolled: true, enrollment, redirectUrl });
  } catch (error: unknown) {
    console.error("VERIFY ORDER ERROR:", error);
    return apiServerError(error instanceof Error ? error.message : "Could not verify payment");
  }
}
