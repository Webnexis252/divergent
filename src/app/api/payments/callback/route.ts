import { NextRequest, NextResponse } from "next/server";
import cashfree from "@/lib/cashfree";
import prisma from "@/lib/prisma";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

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
        new URL("/dashboard/courses?payment=error&reason=missing_order", req.url),
      );
    }

    // Fetch order status from Cashfree
    const response = await cashfree.PGOrderFetchPayments(orderId);
    const payments = response?.data || [];
    const successfulPayment = payments.find(
      (p: { payment_status?: string }) => p.payment_status === "SUCCESS",
    );

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { cashfreeOrderId: orderId },
    });

    if (successfulPayment && payment) {
      // Update payment if still pending
      if (payment.status === "PENDING") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "SUCCESS",
            cashfreePaymentId: String(successfulPayment.cf_payment_id || ""),
          },
        });

        // Enroll the user
        if (payment.courseId) {
          await ensureActiveEnrollmentWithXp(payment.userId, payment.courseId);
        }
      }

      return NextResponse.redirect(
        new URL("/dashboard/courses?payment=success", req.url),
      );
    }

    // Payment failed or pending
    if (payment && payment.status === "PENDING") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.redirect(
      new URL("/dashboard/courses?payment=failed", req.url),
    );
  } catch (error) {
    console.error("[PAYMENT_CALLBACK] Error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/courses?payment=error", req.url),
    );
  }
}
