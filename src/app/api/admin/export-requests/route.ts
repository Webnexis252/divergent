import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({ success: true, status: "APPROVED" });
    }

    const latestRequest = await prisma.dataExportRequest.findFirst({
      where: { adminId: user.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, status: latestRequest?.status || null });
  } catch (error: any) {
    console.error("Error fetching export request status:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch export request status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["ADMIN"]);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if there's already a pending request
    const pendingRequest = await prisma.dataExportRequest.findFirst({
      where: { adminId: user.userId, status: "PENDING" },
    });

    if (pendingRequest) {
      return NextResponse.json({ success: false, error: "You already have a pending export request." }, { status: 400 });
    }

    // Create a new request
    await prisma.dataExportRequest.create({
      data: {
        adminId: user.userId,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, message: "Export request submitted successfully." });
  } catch (error: any) {
    console.error("Error creating export request:", error);
    return NextResponse.json({ success: false, error: "Failed to create export request" }, { status: 500 });
  }
}
