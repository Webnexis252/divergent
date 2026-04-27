import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError, apiForbidden, apiNotFound, apiServerError } from "@/lib/api-response";
import { sendTeacherOtpEmail } from "@/lib/email";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/admin/mentors/[mentorId]/otp
 * Admin/SuperAdmin generates a 6-digit activation OTP for a teacher.
 * Activates the account (PENDING → ACTIVE) and emails the OTP.
 * Returns OTP in response so admin can also share manually.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mentorId: string }> }
) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "SUPER_ADMIN"]);
    if (!auth) return apiForbidden("Admin access required");

    const { mentorId } = await params;

    const teacher = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, name: true, email: true, role: true, mentorStatus: true },
    });

    if (!teacher) return apiNotFound("Teacher");
    if (teacher.role !== "MENTOR") return apiError("User is not a MENTOR", 400);

    const otp = generateOtp();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: mentorId },
      data: {
        mentorOtp: otp,
        mentorOtpExpiry: expiry,
        mentorStatus: "ACTIVE", // Activating on OTP generation (admin approval grants access)
      },
    });

    // Send OTP email (non-blocking — don't fail the request if email fails)
    if (teacher.email) {
      sendTeacherOtpEmail({
        to: teacher.email,
        name: teacher.name ?? "",
        otp,
      }).catch((err) => console.error("[OTP_EMAIL_ERROR]", err));
    }

    return apiSuccess(
      {
        otp,
        expiresAt: expiry.toISOString(),
        teacherName: teacher.name,
        teacherEmail: teacher.email,
      },
      "OTP generated and emailed to teacher. OTP expires in 15 minutes."
    );
  } catch (err) {
    console.error("[GENERATE_OTP_ERROR]", err);
    return apiServerError();
  }
}
