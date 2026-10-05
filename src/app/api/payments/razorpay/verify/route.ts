import { NextRequest } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/api-response";
import { completePayment } from "@/lib/payments";
import { safeEqual } from "@/lib/secure-compare";

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

    if (!safeEqual(String(razorpay_signature), expectedSignature)) {
      return apiError("Invalid payment signature", 400);
    }

    // Find the pending payment
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
      select: { id: true },
    });

    if (!payment) {
      return apiError("Payment record not found", 404);
    }

    // Marks SUCCESS and enrolls exactly once; a repeated call is a no-op.
    // What gets unlocked comes from the Payment row created at checkout.
    const { completed, payment: updated } = await completePayment(payment.id, {
      razorpayPaymentId: razorpay_payment_id,
    });

    if (updated.status !== "SUCCESS") {
      return apiError("Payment could not be completed", 409);
    }

    let redirectUrl = "/dashboard/courses";
    if (updated.bundleId) {
      const bundle = await prisma.bundle.findUnique({
        where: { id: updated.bundleId },
        select: { slug: true },
      });
      if (bundle) redirectUrl = `/dashboard/bundles/${bundle.slug}?success=true`;
    } else if (updated.courseId) {
      const course = await prisma.course.findUnique({
        where: { id: updated.courseId },
        select: { slug: true },
      });
      if (course) redirectUrl = `/dashboard/courses/${course.slug}?success=true`;
    }

    return apiSuccess({
      message: completed ? "Payment verified successfully" : "Payment already processed",
      redirectUrl,
    });
  } catch (error: unknown) {
    console.error("[RAZORPAY VERIFY] Error:", error);
    return apiError("Failed to verify payment", 500);
  }
}
