import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ensureActiveEnrollmentWithXp } from "@/lib/xp";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ["SUPER_ADMIN", "ADMIN"]);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone, password, courseId } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate courseId if provided
    if (courseId) {
      const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
      if (!course) {
        return NextResponse.json({ success: false, error: "Selected course not found" }, { status: 400 });
      }
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
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash,
          role: "STUDENT"
        }
      });

      // Enroll in course immediately (offline/cash payment)
      if (courseId) {
        await ensureActiveEnrollmentWithXp(newUser.id, courseId);
      }

      return NextResponse.json({
        success: true,
        data: newUser,
        message: courseId
          ? "Student created and enrolled in course successfully."
          : "Student created successfully.",
      });
    } else {
      // Create an approval request (include courseId so super admin can honor it)
      const request = await prisma.studentApprovalRequest.create({
        data: {
          name,
          email,
          phone: phone || null,
          passwordHash,
          courseId: courseId || null,
          requestedBy: user.userId,
          status: "PENDING"
        }
      });
      return NextResponse.json({
        success: true,
        data: request,
        message: "Verification message sent to Super Admin for approval.",
      });
    }
  } catch (error: unknown) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to create student" },
      { status: 500 }
    );
  }
}
