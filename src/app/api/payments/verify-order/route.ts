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

    // Fetch the pending payment record to check for installment logic
    const dbPayment = await prisma.payment.findFirst({
      where: { cashfreeOrderId: order_id, userId: auth.userId },
    });

    // Update Payment status to SUCCESS
    await prisma.payment.updateMany({
      where: { cashfreeOrderId: order_id, userId: auth.userId },
      data: {
        status: 'SUCCESS',
        cashfreePaymentId: String(successfulPayment.cf_payment_id || ''),
      },
    });

    if (dbPayment?.couponCode) {
      await prisma.coupon.update({
        where: { code: dbPayment.couponCode },
        data: { usedCount: { increment: 1 } },
      }).catch(err => console.error("Failed to increment coupon count:", err));
    }

    if (bundleId) {
      // Enroll user in ALL courses inside the bundle
      const bundleCourses = await (prisma as any).bundleCourse.findMany({
        where: { bundleId },
        select: { courseId: true },
      });
      await Promise.all(bundleCourses.map((bc: { courseId: string }) => ensureActiveEnrollmentWithXp(auth.userId, bc.courseId, 'ACTIVE', true, bundleId)));
      return apiSuccess({ enrolled: true, type: 'bundle', courseCount: bundleCourses.length });
    }

    // Single course enrollment
    let installmentOptions: { isInstallmentBased: boolean; currentInstallment: number; validUntil: Date | null } | undefined;

    if (dbPayment?.installmentIndex !== null && dbPayment?.installmentIndex !== undefined) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { emiPlans: true }
      });
      
      const emiPlans = course?.emiPlans as any[] | null;
      if (emiPlans && emiPlans.length > 0) {
        const index = dbPayment.installmentIndex;
        const plan = emiPlans[index];
        
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: auth.userId, courseId: courseId! } }
        });

        const isLastInstallment = index === emiPlans.length - 1;
        let newValidUntil: Date | null = null;
        
        if (!isLastInstallment) {
          const baseDate = existingEnrollment?.validUntil ? new Date(existingEnrollment.validUntil) : new Date();
          newValidUntil = new Date(baseDate.getTime() + (plan.dueDays * 24 * 60 * 60 * 1000));
        }

        installmentOptions = {
          isInstallmentBased: true,
          currentInstallment: index + 1,
          validUntil: newValidUntil
        };
      }
    }

    const { enrollment } = await ensureActiveEnrollmentWithXp(auth.userId, courseId, 'ACTIVE', true, undefined, installmentOptions);
    return apiSuccess({ enrolled: true, enrollment });
  } catch (error: unknown) {
    console.error("VERIFY ORDER ERROR:", error);
    return apiServerError(error instanceof Error ? error.message : "Could not verify payment");
  }
}
