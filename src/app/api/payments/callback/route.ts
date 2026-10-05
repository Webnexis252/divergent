import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { completePayment, failPayment } from "@/lib/payments";
import { fetchCashfreeOutcome } from "@/lib/payment-gateways";

/**
 * GET /api/payments/callback?order_id=xxx
 * Cashfree redirects the user here after payment.
 * We verify the order status server-side, enroll if successful,
 * and redirect the user to the appropriate page.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.redirect(
        new URL("/payment/status?status=failed&message=missing_order", req.url),
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { cashfreeOrderId: orderId },
      select: { id: true, status: true },
    });
    if (!payment) {
      return NextResponse.redirect(
        new URL("/payment/status?status=failed&message=missing_order", req.url),
      );
    }

    // Ask Cashfree (circuit-breaker protected) rather than trusting the redirect
    const outcome = await fetchCashfreeOutcome(orderId);

    if (outcome.state === "PAID") {
      // No-op if the webhook already completed it
      await completePayment(payment.id, outcome.reference);
      return NextResponse.redirect(new URL("/payment/status?status=success", req.url));
    }

    if (outcome.state === "IN_PROGRESS") {
      // e.g. a UPI payment awaiting approval: don't mark it failed, the
      // webhook or the reconciliation cron completes it when it clears
      return NextResponse.redirect(new URL("/payment/status?status=pending", req.url));
    }

    // Only PENDING → FAILED; a payment the webhook already completed stays SUCCESS
    await failPayment(payment.id);
    const latest = await prisma.payment.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });

    return NextResponse.redirect(
      new URL(`/payment/status?status=${latest?.status === "SUCCESS" ? "success" : "failed"}`, req.url),
    );
  } catch (error) {
    console.error("[PAYMENT_CALLBACK] Error:", error);
    return NextResponse.redirect(
      new URL("/payment/status?status=failed&message=error", req.url),
    );
  }
}
