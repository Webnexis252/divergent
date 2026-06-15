import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return apiError("Razorpay is not configured", 503);
  }

  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return apiError("Missing razorpay payment details", 400);
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return apiError("Invalid payment signature", 400);
    }

    // Find the pending payment
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!payment) {
      return apiError("Payment record not found", 404);
    }

    if (payment.status === "SUCCESS") {
      return apiSuccess({ message: "Payment already processed", redirectUrl: "/dashboard/courses" });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    if (payment.couponCode) {
      await prisma.coupon.update({
        where: { code: payment.couponCode },
        data: { usedCount: { increment: 1 } },
      }).catch(err => console.error("Failed to increment coupon count:", err));
    }

    // Process enrollment
    let redirectUrl = "/dashboard/courses";

    if (payment.bundleId) {
      // Enroll in all bundle courses
      const bundleCourses = await prisma.bundleCourse.findMany({
        where: { bundleId: payment.bundleId },
        select: { courseId: true },
      });
      await Promise.all(
        bundleCourses.map((bc) =>
          ensureActiveEnrollmentWithXp(payment.userId, bc.courseId, "ACTIVE", true, payment.bundleId ?? undefined)
        )
      );

      const bundle = await prisma.bundle.findUnique({
        where: { id: payment.bundleId },
        select: { slug: true },
      });
      if (bundle) {
        redirectUrl = `/dashboard/bundles/${bundle.slug}?success=true`;
      }
    } else if (payment.courseId) {
      // Single course enrollment
      let installmentOptions: { isInstallmentBased: boolean; currentInstallment: number; validUntil: Date | null } | undefined;

      if (payment.installmentIndex !== null && payment.installmentIndex !== undefined) {
        const course = await prisma.course.findUnique({
          where: { id: payment.courseId },
          select: { emiPlans: true }
        });
        
        const emiPlans = course?.emiPlans as any[] | null;
        if (emiPlans && emiPlans.length > 0) {
          const index = payment.installmentIndex;
          const plan = emiPlans[index];
          
          const existingEnrollment = await prisma.enrollment.findUnique({
            where: { userId_courseId: { userId: payment.userId, courseId: payment.courseId } }
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

      await ensureActiveEnrollmentWithXp(payment.userId, payment.courseId, "ACTIVE", true, undefined, installmentOptions);

      const course = await prisma.course.findUnique({
        where: { id: payment.courseId },
        select: { slug: true },
      });
      if (course) {
        redirectUrl = `/dashboard/courses/${course.slug}?success=true`;
      }
    }

    return apiSuccess({ message: "Payment verified successfully", redirectUrl });
  } catch (error: unknown) {
    console.error("[RAZORPAY VERIFY] Error:", error);
    return apiError("Failed to verify payment", 500);
  }
}
