import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { completePayment, failPayment } from "@/lib/payments";
import { safeEqual } from "@/lib/secure-compare";

/**
 * POST /api/payments/webhook
 * Cashfree sends asynchronous payment status updates to this endpoint.
 * This is the most reliable way to confirm payments — never rely solely on
 * client-side callbacks.
 *
 * Cashfree retries deliveries, and the redirect callback and verify call may
 * confirm the same order concurrently; completePayment fulfils it once.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const timestamp = req.headers.get("x-webhook-timestamp") || "";
    const signature = req.headers.get("x-webhook-signature") || "";

    // Fail closed: without a secret anyone could post a fake "payment success".
    // Cashfree signs webhooks with the account's secret key.
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;
    if (!webhookSecret) {
      console.error("[CASHFREE_WEBHOOK] No CASHFREE_WEBHOOK_SECRET or CASHFREE_SECRET_KEY set; rejecting webhook");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(timestamp + rawBody)
      .digest("base64");

    if (!safeEqual(signature, expectedSignature)) {
      console.error("[CASHFREE_WEBHOOK] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const orderId = payload.data?.order?.order_id;

    if (eventType === "PAYMENT_SUCCESS_WEBHOOK" || eventType === "PAYMENT_SUCCESS") {
      if (!orderId) {
        console.error("[CASHFREE_WEBHOOK] Missing order_id in payload");
        return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
      }

      const payment = await prisma.payment.findUnique({
        where: { cashfreeOrderId: orderId },
        select: { id: true },
      });
      if (!payment) {
        // Not one of ours — acknowledge so Cashfree stops retrying
        console.log("[CASHFREE_WEBHOOK] Unknown order:", orderId);
        return NextResponse.json({ status: "ok" });
      }

      const cfPaymentId = payload.data?.payment?.cf_payment_id;
      const { completed, payment: updated } = await completePayment(payment.id, {
        cashfreePaymentId: cfPaymentId ? String(cfPaymentId) : null,
      });
      console.log(
        completed
          ? `[CASHFREE_WEBHOOK] Completed order ${orderId} for user ${updated.userId}`
          : `[CASHFREE_WEBHOOK] Order ${orderId} already ${updated.status}; nothing to do`,
      );
    } else if (eventType === "PAYMENT_FAILED_WEBHOOK" || eventType === "PAYMENT_FAILED") {
      if (orderId) {
        const payment = await prisma.payment.findUnique({
          where: { cashfreeOrderId: orderId },
          select: { id: true },
        });
        // Only PENDING → FAILED; a SUCCESS is never reverted
        if (payment && (await failPayment(payment.id))) {
          console.log("[CASHFREE_WEBHOOK] Payment failed for order:", orderId);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // 500 makes Cashfree retry; completePayment rolled back, so the retry is safe
    console.error("[CASHFREE_WEBHOOK] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
