import { NextResponse, NextRequest } from "next/server";
import Razorpay from "razorpay";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_YourTestKey",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "YourTestSecret",
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) return NextResponse.json(apiError("Unauthorized", 401), { status: 401 });

    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(apiError("Course ID is required", 400), { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, price: true },
    });

    if (!course) {
      return NextResponse.json(apiError("Course not found", 404), { status: 404 });
    }

    if (course.price <= 0) {
      return NextResponse.json(apiError("Course is free, use normal enrollment", 400), { status: 400 });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: auth.userId, courseId } },
    });

    if (existingEnrollment) {
      return NextResponse.json(apiError("Already enrolled", 409), { status: 409 });
    }

    // Initialize Razorpay Order
    // Amount must be in smallest currency unit (paise for INR)
    const options = {
      amount: Math.round(course.price * 100), 
      currency: "INR",
      receipt: `rcpt_${auth.userId.substring(0, 8)}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      throw new Error("Failed to create Razorpay order");
    }

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId: auth.userId,
        courseId,
        amount: course.price,
        currency: "INR",
        status: "PENDING",
        razorpayOrderId: order.id,
      },
    });

    return NextResponse.json(apiSuccess(order), { status: 200 });

  } catch (error: unknown) {
    console.error("CREATE ORDER ERROR:", error);
    return NextResponse.json(apiError(error instanceof Error ? error.message : "Something went wrong", 500), { status: 500 });
  }
}
