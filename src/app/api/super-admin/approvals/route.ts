import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["SUPER_ADMIN"]);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const studentRequests = await prisma.studentApprovalRequest.findMany({
      where: { status: "PENDING" },
      include: {
        admin: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const exportRequests = await prisma.dataExportRequest.findMany({
      where: { status: "PENDING" },
      include: {
        admin: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: { studentRequests, exportRequests } });
  } catch (error: any) {
    console.error("Error fetching approvals:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch approvals" }, { status: 500 });
  }
}
