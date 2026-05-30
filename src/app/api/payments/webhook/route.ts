import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";
import crypto from "crypto";

/**
 * POST /api/payments/webhook
 * Cashfree sends asynchronous payment status updates to this endpoint.
 * This is the most reliable way to confirm payments — never rely solely on
 * client-side callbacks.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const signature = req.headers.get("x-webhook-signature") || "";

    // Verify webhook signature for security
    if (process.env.CASHFREE_WEBHOOK_SECRET) {
      const signedPayload = timestamp + rawBody;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.CASHFREE_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest("base64");

      if (signature !== expectedSignature) {
        console.error("[CASHFREE_WEBHOOK] Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || eventType === "PAYMENT_SUCCESS") {
      const data = payload.data;
      const orderId = data?.order?.order_id;
      const cfPaymentId = data?.payment?.cf_payment_id;

      if (!orderId) {
        console.error("[CASHFREE_WEBHOOK] Missing order_id in payload");
        return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
      }

      // Find the pending payment record
      const payment = await prisma.payment.findFirst({
        where: { cashfreeOrderId: orderId, status: "PENDING" },
      });

      if (!payment) {
        // Payment already processed or not found — acknowledge anyway
        console.log("[CASHFREE_WEBHOOK] Payment already processed or not found:", orderId);
        return NextResponse.json({ status: "ok" });
      }

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "SUCCESS",
          cashfreePaymentId: cfPaymentId ? String(cfPaymentId) : null,
        },
      });

      // Enroll the user in the course
      if (payment.courseId) {
        await ensureActiveEnrollmentWithXp(payment.userId, payment.courseId);
        console.log(
          `[CASHFREE_WEBHOOK] Enrolled user ${payment.userId} in course ${payment.courseId}`,
        );
      }
    } else if (eventType === "PAYMENT_FAILED_WEBHOOK" || eventType === "PAYMENT_FAILED") {
      const orderId = payload.data?.order?.order_id;
      if (orderId) {
        await prisma.payment.updateMany({
          where: { cashfreeOrderId: orderId, status: "PENDING" },
          data: { status: "FAILED" },
        });
        console.log("[CASHFREE_WEBHOOK] Payment failed for order:", orderId);
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[CASHFREE_WEBHOOK] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
