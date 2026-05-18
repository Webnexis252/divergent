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
    const { order_id, courseId } = body;

    if (!order_id || !courseId) {
      return apiError("Missing required payment details", 400);
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
        status: "SUCCESS",
        cashfreePaymentId: String(successfulPayment.cf_payment_id || ""),
      },
    });

    // Enroll user in the course
    const { enrollment } = await ensureActiveEnrollmentWithXp(auth.userId, courseId);

    return apiSuccess({ enrolled: true, enrollment });
  } catch (error: unknown) {
    console.error("VERIFY ORDER ERROR:", error);
    return apiServerError(error instanceof Error ? error.message : "Could not verify payment");
  }
}
