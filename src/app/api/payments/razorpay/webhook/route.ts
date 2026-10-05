import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { completePayment } from "@/lib/payments";
import { safeEqual } from "@/lib/secure-compare";

/**
 * POST /api/payments/razorpay/webhook
 * Razorpay's server-to-server confirmation. Without it a Razorpay payment is only
 * completed when the student's browser calls /verify after checkout (or by the
 * nightly reconciliation cron), so a closed tab or dropped connection right after
 * paying left the student unenrolled for hours.
 *
 * Configure in Razorpay Dashboard → Webhooks with this URL, the events
 * `payment.captured` and `order.paid`, and a secret stored as
 * RAZORPAY_WEBHOOK_SECRET (Razorpay's webhook secret, not the API key secret).
 *
 * Deliveries are retried and race the /verify call; completePayment fulfils the
 * order exactly once. `payment.failed` is deliberately ignored: Razorpay lets
 * the student retry the same order with another method, and the reconciliation
 * cron expires orders that are never paid.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed: without a secret anyone could post a fake "payment captured"
    console.error("[RAZORPAY_WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not set; rejecting webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!safeEqual(signature, expected)) {
      console.error("[RAZORPAY_WEBHOOK] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.event !== "payment.captured" && event.event !== "order.paid") {
      return NextResponse.json({ status: "ignored" });
    }

    const paymentEntity = event.payload?.payment?.entity;
    const orderId: string | undefined = event.payload?.order?.entity?.id ?? paymentEntity?.order_id;
    if (!orderId) {
      console.error("[RAZORPAY_WEBHOOK] Missing order id in", event.event);
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId: orderId },
      select: { id: true },
    });
    if (!payment) {
      // Not one of ours: acknowledge so Razorpay stops retrying
      console.log("[RAZORPAY_WEBHOOK] Unknown order:", orderId);
      return NextResponse.json({ status: "ok" });
    }

    const { completed, payment: updated } = await completePayment(payment.id, {
      razorpayPaymentId: paymentEntity?.id ? String(paymentEntity.id) : null,
    });
    console.log(
      completed
        ? `[RAZORPAY_WEBHOOK] Completed order ${orderId} for user ${updated.userId}`
        : `[RAZORPAY_WEBHOOK] Order ${orderId} already ${updated.status}; nothing to do`,
    );
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    // 500 makes Razorpay retry; completePayment rolled back, so the retry is safe
    console.error("[RAZORPAY_WEBHOOK] Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
