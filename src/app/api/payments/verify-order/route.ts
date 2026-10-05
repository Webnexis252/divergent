import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess, apiServerError } from "@/lib/api-response";
import { completePayment, failPayment } from "@/lib/payments";
import { fetchCashfreeOutcome } from "@/lib/payment-gateways";

/**
 * POST /api/payments/verify-order
 * Called by the checkout after Cashfree's modal closes. What gets unlocked
 * comes from the caller's own Payment row (created with the price at
 * checkout), never from the request body: otherwise one cheap paid order could
 * be replayed to unlock any course or bundle.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { order_id, courseId, bundleId } = body;

    if (!order_id) {
      return apiError('Missing required payment details', 400);
    }

    const payment = await prisma.payment.findFirst({
      where: { cashfreeOrderId: order_id, userId: auth.userId },
      select: { id: true, courseId: true, bundleId: true },
    });
    if (!payment) {
      return apiError("Payment not found", 404);
    }
    if ((courseId && courseId !== payment.courseId) || (bundleId && bundleId !== payment.bundleId)) {
      return apiError("This order was not placed for that course", 400);
    }

    // Verify order status with Cashfree server
    const outcome = await fetchCashfreeOutcome(order_id);

    if (outcome.state === "IN_PROGRESS") {
      return apiError(
        "Your payment is still processing. You'll be enrolled automatically as soon as it clears.",
        409,
      );
    }

    if (outcome.state === "UNPAID") {
      // Only PENDING → FAILED; never reverts a payment the webhook completed
      await failPayment(payment.id);
      const latest = await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } });
      if (latest?.status !== "SUCCESS") {
        return apiError("Payment was not successful", 400);
      }
    } else {
      // No-op if the webhook or redirect already completed it
      await completePayment(payment.id, outcome.reference);
    }

    if (payment.bundleId) {
      const courseCount = await prisma.bundleCourse.count({ where: { bundleId: payment.bundleId } });
      return apiSuccess({ enrolled: true, type: 'bundle', courseCount });
    }

    const enrollment = payment.courseId
      ? await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: auth.userId, courseId: payment.courseId } },
        })
      : null;
    return apiSuccess({ enrolled: true, enrollment });
  } catch (error: unknown) {
    console.error("VERIFY ORDER ERROR:", error);
    return apiServerError(error instanceof Error ? error.message : "Could not verify payment");
  }
}
