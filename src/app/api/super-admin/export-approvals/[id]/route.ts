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
    const { action } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const request = await prisma.dataExportRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    if (request.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Request is no longer pending" }, { status: 400 });
    }

    await prisma.dataExportRequest.update({
      where: { id },
      data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED" },
    });

    return NextResponse.json({ success: true, message: `Export request ${action.toLowerCase()}d successfully.` });
  } catch (error: unknown) {
    console.error("Error updating export approval:", error);
    return NextResponse.json({ success: false, error: "Failed to update export approval" }, { status: 500 });
  }
}
