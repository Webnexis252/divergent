import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

    const request = await prisma.teacherApprovalRequest.findUnique({
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

        // Suspend the teacher
        await prisma.$transaction([
          prisma.user.update({
            where: { id: request.targetUserId },
            data: { mentorStatus: "SUSPENDED" }
          }),
          prisma.teacherApprovalRequest.update({
            where: { id },
            data: { status: "APPROVED" }
          })
        ]);

        return NextResponse.json({ success: true, message: "Teacher account suspended successfully." });
      } else if (request.type === "DELETE") {
        if (!request.targetUserId) {
          return NextResponse.json({ success: false, error: "Target user ID missing for deletion request" }, { status: 400 });
        }

        // Delete the teacher and update request status
        await prisma.$transaction([
          prisma.user.delete({
            where: { id: request.targetUserId }
          }),
          prisma.teacherApprovalRequest.update({
            where: { id },
            data: { status: "APPROVED" }
          })
        ]);

        return NextResponse.json({ success: true, message: "Teacher account deleted successfully." });
      } else {
        // Handle CREATE if implemented later, or just error for now.
        return NextResponse.json({ success: false, error: "Teacher creation via approval request not supported yet." }, { status: 400 });
      }
    } else {
      await prisma.teacherApprovalRequest.update({
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
