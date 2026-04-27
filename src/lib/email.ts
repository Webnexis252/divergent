import nodemailer from "nodemailer";

/**
 * Nodemailer transport.
 * Set these env vars in .env.local:
 *   EMAIL_HOST     — SMTP host (e.g. smtp.gmail.com)
 *   EMAIL_PORT     — SMTP port (e.g. 587)
 *   EMAIL_USER     — SMTP username / Gmail address
 *   EMAIL_PASS     — SMTP password / Gmail App Password
 *   EMAIL_FROM     — "From" display name + address
 */
function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
    port: parseInt(process.env.EMAIL_PORT ?? "587"),
    secure: parseInt(process.env.EMAIL_PORT ?? "587") === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

const FROM = process.env.EMAIL_FROM ?? '"Divergent Classes" <noreply@divergentclasses.com>';

// ─── Teacher OTP Activation Email ─────────────────────────────────────────────

export async function sendTeacherOtpEmail({
  to,
  name,
  otp,
}: {
  to: string;
  name: string;
  otp: string;
}) {
  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to,
    subject: "Your Teacher Account Activation OTP — Divergent Classes",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#38c1ff,#0077ff);padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.7);text-transform:uppercase">
              Divergent Classes
            </p>
            <h1 style="margin:12px 0 0;font-size:28px;font-weight:800;color:#ffffff">
              Activate Your Teacher Account
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6">
              Hi <strong>${name || "there"}</strong>,
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
              Your teacher account registration has been approved. Use the one-time password below to activate your account.
              This OTP is valid for <strong>15 minutes</strong>.
            </p>

            <!-- OTP Box -->
            <div style="text-align:center;margin:32px 0">
              <div style="display:inline-block;background:#f0f9ff;border:2px dashed #38c1ff;border-radius:16px;padding:24px 48px">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.15em;color:#38c1ff;text-transform:uppercase">
                  One-Time Password
                </p>
                <p style="margin:0;font-size:42px;font-weight:900;letter-spacing:10px;color:#111827;font-family:monospace">
                  ${otp}
                </p>
              </div>
            </div>

            <p style="margin:0 0 12px;font-size:14px;color:#6b7280;line-height:1.6">
              Enter this OTP on the teacher login page:
            </p>
            <div style="text-align:center;margin-bottom:32px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/teacher-login"
                style="display:inline-block;background:#38c1ff;color:#ffffff;font-weight:700;font-size:14px;
                       text-decoration:none;padding:14px 32px;border-radius:12px">
                Go to Teacher Login →
              </a>
            </div>

            <hr style="border:none;border-top:1px solid #f0f0f5;margin:28px 0" />
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
              If you did not register for a teacher account, please ignore this email.
              This OTP expires automatically and cannot be reused.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Hi ${name || "there"},\n\nYour teacher account activation OTP is: ${otp}\n\nThis OTP expires in 15 minutes.\n\nVisit: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/teacher-login\n\nDivergent Classes`,
  });
}

// ─── Teacher Password Set Notification ────────────────────────────────────────

export async function sendTeacherPasswordSetEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const transport = createTransport();
  await transport.sendMail({
    from: FROM,
    to,
    subject: "Your Teacher Login Password Has Been Set — Divergent Classes",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <tr>
          <td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:36px 40px;text-align:center">
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff">Password Set ✓</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px">
            <p style="margin:0 0 20px;font-size:16px;color:#374151">Hi <strong>${name || "there"}</strong>,</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.7">
              An admin has set a direct login password for your teacher account.
              You can now log in using your email and the password provided to you by your admin.
            </p>
            <div style="text-align:center;margin-bottom:32px">
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login"
                style="display:inline-block;background:#22c55e;color:#ffffff;font-weight:700;font-size:14px;
                       text-decoration:none;padding:14px 32px;border-radius:12px">
                Login to Dashboard →
              </a>
            </div>
            <p style="margin:0;font-size:12px;color:#9ca3af">
              If you did not expect this, please contact your administrator immediately.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Hi ${name || "there"},\n\nAn admin has set a password for your teacher account. Login at: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/login\n\nDivergent Classes`,
  });
}
