import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId, courseId, amount, paymentDate, referenceNumber, notes, receiptUrl, installmentIndex } = await req.json();

    if (!userId || !courseId || amount === undefined || installmentIndex === undefined) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Wrap in a transaction to ensure Payment and Enrollment update atomically
    await prisma.$transaction(async (tx) => {
      // 1. Create the Payment
      await tx.payment.create({
        data: {
          userId,
          courseId,
          amount: parseFloat(amount),
          paymentGateway: "CASH",
          status: "SUCCESS",
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          receiptUrl: receiptUrl || null,
          installmentIndex: parseInt(installmentIndex),
          createdAt: paymentDate ? new Date(paymentDate) : new Date(),
        }
      });

      // 2. Fetch the current enrollment
      const enrollment = await tx.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: { course: true }
      });

      if (!enrollment || !enrollment.isInstallmentBased) {
        throw new Error("Installment enrollment not found.");
      }

      // Parse emiPlans from the course to determine next validUntil
      let emiPlans: any[] = [];
      if (enrollment.course.emiPlans) {
        emiPlans = typeof enrollment.course.emiPlans === 'string' 
          ? JSON.parse(enrollment.course.emiPlans) 
          : enrollment.course.emiPlans;
      }

      const requestedIndex = parseInt(installmentIndex);

      // We only advance the currentInstallment if the payment is for the exact current pending installment
      if (enrollment.currentInstallment === requestedIndex) {
        const nextInstallment = enrollment.currentInstallment + 1;
        let nextValidUntil = null;

        // If there is another installment after this one
        if (nextInstallment < emiPlans.length) {
          const nextPlan = emiPlans[nextInstallment];
          const dueDays = nextPlan.dueDays || 30; // Default 30 days if not specified
          
          const baseDate = enrollment.validUntil ? new Date(enrollment.validUntil) : new Date();
          // If the installment was expired, base the new validUntil from today instead of the old expired date
          // Otherwise, if they pay early, extend from the existing validUntil
          const effectiveBaseDate = baseDate.getTime() < Date.now() ? new Date() : baseDate;

          nextValidUntil = new Date(effectiveBaseDate.getTime() + (dueDays * 24 * 60 * 60 * 1000));
        }

        await tx.enrollment.update({
          where: { id: enrollment.id },
          data: {
            currentInstallment: nextInstallment,
            validUntil: nextValidUntil
          }
        });
      }
    });

    return NextResponse.json({ success: true, message: "Cash payment recorded successfully" });
  } catch (error: any) {
    console.error("Error recording cash payment:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to record cash payment" }, { status: 500 });
  }
}
