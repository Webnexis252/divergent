import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "@node-rs/bcrypt";
import prisma from "@/lib/prisma";
import { getAuthCookieOptions, AUTH_COOKIE_NAME, requireAuth, signToken } from "@/lib/auth";
import { revokeAllSessions } from "@/lib/session-revocation";

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await req.json();

    if (!password || password.trim().length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ success: false, error: "Password must contain at least one uppercase letter" }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ success: false, error: "Password must contain at least one number" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash },
    });

    // Sign out every other device (anyone who had the old password or a
    // stolen token), then give this device a fresh token so it stays signed in
    await revokeAllSessions(auth.userId);
    const response = NextResponse.json({ success: true, message: "Password updated successfully" });
    response.cookies.set(AUTH_COOKIE_NAME, await signToken(auth), getAuthCookieOptions());
    return response;
  } catch (error) {
    console.error("[UPDATE_PASSWORD_ERROR]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
