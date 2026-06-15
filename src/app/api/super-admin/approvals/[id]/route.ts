import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth(req, ["SUPER_ADMIN"]);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body; // "APPROVE" or "REJECT"

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const request = await prisma.studentApprovalRequest.findUnique({
      where: { id }
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Request is already processed" }, { status: 400 });
    }

    if (action === "APPROVE") {
      if (request.type === "SUSPEND") {
        if (!request.targetUserId) {
          return NextResponse.json({ success: false, error: "Target user ID missing for suspension request" }, { status: 400 });
        }

        // Suspend the user (pause all enrollments)
        await prisma.$transaction([
          prisma.enrollment.updateMany({
            where: { userId: request.targetUserId },
            data: { status: "PAUSED" }
          }),
          prisma.studentApprovalRequest.update({
            where: { id },
            data: { status: "APPROVED" }
          })
        ]);

        return NextResponse.json({ success: true, message: "Student account suspended successfully." });
      } else if (request.type === "DELETE") {
        if (!request.targetUserId) {
          return NextResponse.json({ success: false, error: "Target user ID missing for deletion request" }, { status: 400 });
        }

        // Hard delete the user, their restricting relations, and update request status
        await prisma.$transaction([
          prisma.payment.deleteMany({ where: { userId: request.targetUserId } }),
          prisma.doubtReply.deleteMany({ where: { authorId: request.targetUserId } }),
          prisma.doubtTicket.deleteMany({ where: { mentorId: request.targetUserId } }),
          prisma.post.deleteMany({ where: { authorId: request.targetUserId } }),
          prisma.user.delete({
            where: { id: request.targetUserId }
          }),
          prisma.studentApprovalRequest.update({
            where: { id },
            data: { status: "APPROVED" }
          })
        ]);

        return NextResponse.json({ success: true, message: "Student account deleted successfully." });
      } else if (request.type === "EXTEND_INSTALLMENT") {
        if (!request.targetUserId || !request.courseId) {
          return NextResponse.json({ success: false, error: "Target user ID or course ID missing for extension request" }, { status: 400 });
        }

        const enrollment = await prisma.enrollment.findUnique({
          where: { userId_courseId: { userId: request.targetUserId, courseId: request.courseId } },
          include: { course: true }
        });

        if (!enrollment || !enrollment.isInstallmentBased) {
          return NextResponse.json({ success: false, error: "Enrollment not found or not installment based" }, { status: 400 });
        }

        const emiPlans = enrollment.course.emiPlans as any[] | null;
        if (!emiPlans || emiPlans.length <= enrollment.currentInstallment) {
           return NextResponse.json({ success: false, error: "No pending installments found" }, { status: 400 });
        }
        
        const plan = emiPlans[enrollment.currentInstallment];
        const baseDate = enrollment.validUntil ? new Date(enrollment.validUntil) : new Date();
        const newValidUntil = new Date(baseDate.getTime() + (plan.dueDays * 24 * 60 * 60 * 1000));

        await prisma.$transaction([
          prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { validUntil: newValidUntil }
          }),
          prisma.studentApprovalRequest.update({
            where: { id },
            data: { status: "APPROVED" }
          })
        ]);

        return NextResponse.json({ success: true, message: "Installment extended successfully." });
      } else {
        // Default CREATE behavior
        // Check user doesn't already exist
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              { email: request.email },
              { phone: request.phone || undefined }
            ]
          }
        });

        if (existingUser) {
          return NextResponse.json(
            { success: false, error: "User with this email or phone already exists" },
            { status: 400 }
          );
        }

        // Create user and mark request as approved in a transaction
        const [newUser] = await prisma.$transaction([
          prisma.user.create({
            data: {
              name: request.name,
              email: request.email,
              phone: request.phone,
              passwordHash: request.passwordHash,
              role: "STUDENT"
            }
          }),
          prisma.studentApprovalRequest.update({
            where: { id },
            data: { status: "APPROVED" }
          })
        ]);

        // Enroll in course if specified (offline/cash payment requested by admin)
        if (request.courseId) {
          await ensureActiveEnrollmentWithXp(newUser.id, request.courseId);
        }

        return NextResponse.json({
          success: true,
          message: request.courseId
            ? "Student approved, created, and enrolled in course successfully."
            : "Student approved and created successfully.",
        });
      }
    } else {
      await prisma.studentApprovalRequest.update({
        where: { id },
        data: { status: "REJECTED" }
      });
      return NextResponse.json({ success: true, message: "Request rejected successfully." });
    }
  } catch (error: unknown) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    );
  }
}
