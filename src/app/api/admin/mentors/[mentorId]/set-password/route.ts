import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError, apiForbidden, apiNotFound, apiServerError } from "@/lib/api-response";
import { sendTeacherPasswordSetEmail } from "@/lib/email";

/**
 * POST /api/admin/mentors/[mentorId]/set-password
 * Admin/SuperAdmin sets a direct login password for a teacher account.
 * Activates account, clears any pending OTP, and notifies teacher by email.
 * Teacher can then login via the normal /login page.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mentorId: string }> }
) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const { mentorId } = await params;
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

    const teacher = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!teacher) return apiNotFound("Teacher");
    if (teacher.role !== "MENTOR") return apiError("User is not a MENTOR", 400);

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: mentorId },
      data: {
        passwordHash,
        mentorStatus: "ACTIVE",
        mentorOtp: null,
        mentorOtpExpiry: null,
      },
    });

    // Notify teacher by email (non-blocking)
    if (teacher.email) {
      sendTeacherPasswordSetEmail({
        to: teacher.email,
        name: teacher.name ?? "",
      }).catch((err) => console.error("[PASSWORD_SET_EMAIL_ERROR]", err));
    }

    return apiSuccess(
      { teacherId: mentorId, teacherEmail: teacher.email },
      "Password set successfully. Teacher can now login via the standard login page."
    );
  } catch (err) {
    console.error("[SET_PASSWORD_ERROR]", err);
    return apiServerError();
  }
}
