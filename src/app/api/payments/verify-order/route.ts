import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, apiServerError } from "@/lib/api-response";
import crypto from "crypto";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courseId) {
      return apiError("Missing required payment details", 400);
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || "YourTestSecret";
    
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(sign.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Security measure: mark payment as failed/malicious if tampered
      await prisma.payment.updateMany({
        where: { razorpayOrderId: razorpay_order_id },
        data: { status: "FAILED" },
      });
      return apiError("Invalid payment signature", 400);
    }

    // 1. Update Payment status to COMPLETED
    await prisma.payment.updateMany({
      where: { razorpayOrderId: razorpay_order_id, userId: auth.userId },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    // 2. Enroll user in the course
    const { enrollment } = await ensureActiveEnrollmentWithXp(auth.userId, courseId);

    return apiSuccess({ enrolled: true, enrollment });

  } catch (error: unknown) {
    console.error("VERIFY ORDER ERROR:", error);
    return apiServerError(error instanceof Error ? error.message : "Could not verify payment");
  }
}
