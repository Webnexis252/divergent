import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { userId, courseId, name, email, phone } = await req.json();

    if (!userId || !courseId || !name || !email) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Check if there is already a pending extension request
    const existingRequest = await prisma.studentApprovalRequest.findFirst({
      where: {
        type: "EXTEND_INSTALLMENT",
        targetUserId: userId,
        courseId: courseId,
        status: "PENDING"
      }
    });

    if (existingRequest) {
      return NextResponse.json({ success: false, error: "An extension request is already pending for this installment" }, { status: 400 });
    }

    await prisma.studentApprovalRequest.create({
      data: {
        type: "EXTEND_INSTALLMENT",
        targetUserId: userId,
        courseId: courseId,
        name: name,
        email: email,
        phone: phone || null,
        requestedBy: admin.userId,
        status: "PENDING"
      }
    });

    return NextResponse.json({ success: true, message: "Extension request sent to Super Admin" });
  } catch (error: any) {
    console.error("Error creating extension request:", error);
    return NextResponse.json({ success: false, error: "Failed to send extension request" }, { status: 500 });
  }
}
