import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["SUPER_ADMIN", "ADMIN"]);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone: phone || undefined }
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User with this email or phone already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (user.role === "SUPER_ADMIN") {
      // Directly create the student
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash,
          role: "STUDENT"
        }
      });
      return NextResponse.json({ success: true, data: user, message: "Student created successfully." });
    } else {
      // Create an approval request
      const request = await prisma.studentApprovalRequest.create({
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash,
          requestedBy: user.userId,
          status: "PENDING"
        }
      });
      return NextResponse.json({ success: true, data: request, message: "Verification message sent to Super Admin for approval." });
    }
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create student" },
      { status: 500 }
    );
  }
}
