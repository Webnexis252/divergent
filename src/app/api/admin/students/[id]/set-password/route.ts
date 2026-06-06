import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError, apiForbidden, apiNotFound, apiServerError } from "@/lib/api-response";

/**
 * POST /api/admin/students/[id]/set-password
 * Admin/SuperAdmin sets a direct login password for a student account.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const { id } = await params;
    const body = await req.json();
    const { password } = body as { password?: string };

    if (!password || password.trim().length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }
    if (!/[A-Z]/.test(password)) {
      return apiError("Password must contain at least one uppercase letter", 400);
    }
    if (!/[0-9]/.test(password)) {
      return apiError("Password must contain at least one number", 400);
    }

    const student = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!student) return apiNotFound("Student");
    if (student.role !== "STUDENT") return apiError("User is not a STUDENT", 400);

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
      },
    });

    return apiSuccess(
      { studentId: id, studentEmail: student.email },
      "Password set successfully. Student can now login."
    );
  } catch (err) {
    console.error("[SET_STUDENT_PASSWORD_ERROR]", err);
    return apiServerError();
  }
}
