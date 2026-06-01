"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  GraduationCap,
  UserRound,
  CheckCircle2,
  Phone,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Surface } from "@/components/ui/surface";
import { cx } from "@/lib/cx";

type SignupRole = "STUDENT" | "MENTOR";

const options = [
  {
    value: "MENTOR" as const,
    label: "Teacher",
    description:
      "Create a mentor account and land in the teaching workspace immediately.",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    value: "STUDENT" as const,
    label: "Student",
    description:
      "Join the student dashboard for classes, quizzes, doubts, and assignments.",
    icon: <UserRound className="h-4 w-4" />,
  },
];

const OTP_COOLDOWN_SECS = 60;

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<SignupRole>("MENTOR");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Phone OTP states ---
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneVerifiedToken, setPhoneVerifiedToken] = useState<string | null>(null);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "invalid_token") {
      setError(
        "The registration link is invalid or has expired. Please sign up again."
      );
    } else if (errorParam === "missing_token") {
      setError("Registration link is missing.");
    } else if (errorParam === "server_error") {
      setError(
        "An error occurred while creating your account. Please try again."
      );
    }
  }, [searchParams]);

  // Reset phone verification when phone number changes
  useEffect(() => {
    if (phoneVerified || phoneOtpSent) {
      setPhoneVerified(false);
      setPhoneVerifiedToken(null);
      setPhoneOtpSent(false);
      setOtpValue("");
      setOtpError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  // Countdown timer for OTP resend cooldown
  const startCooldown = () => {
    setOtpCooldown(OTP_COOLDOWN_SECS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setOtpCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  // Send OTP to phone
  const handleSendOtp = async () => {
    setOtpError(null);
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/phone-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), context: "SIGNUP" }),
      });
      const json = await res.json();
      if (!json.success) {
        setOtpError(json.error ?? "Failed to send OTP. Please try again.");
        return;
      }
      setPhoneOtpSent(true);
      startCooldown();
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  // Verify the entered OTP
  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    setOtpError(null);
    setOtpVerifying(true);
    try {
      const res = await fetch("/api/auth/phone-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), otp: otpValue, context: "SIGNUP" }),
      });
      const json = await res.json();
      if (!json.success) {
        setOtpError(json.error ?? "Invalid OTP. Please try again.");
        return;
      }
      setPhoneVerified(true);
      setPhoneVerifiedToken(json.data.phoneVerifiedToken);
      setPhoneOtpSent(false);
      setOtpValue("");
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    // Block submit if phone is entered but not verified
    if (phone.trim() && !phoneVerified) {
      setError("Please verify your phone number via OTP before creating your account.");
      setIsSubmitting(false);
      return;
    }

    try {
      const url =
        role === "MENTOR" ? "/api/auth/register/teacher" : "/api/auth/register";
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: phone.trim() || undefined,
          phoneVerifiedToken: phoneVerifiedToken ?? undefined,
          role,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: { user?: { role: SignupRole }; magicLinkSent?: boolean };
        message?: string;
      };

      if (!response.ok || !payload.success) {
        setError(payload.error ?? "Unable to create your account right now.");
        return;
      }

      if (role === "MENTOR") {
        router.push("/teacher-register?status=pending");
        return;
      }

      if (payload.data?.magicLinkSent) {
        setSuccessMessage(
          payload.message ??
            "Registration link sent! Please check your email to complete signup."
        );
        return;
      }

      setError("Invalid response from server.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <Surface className="w-full max-w-[35rem] px-5 py-8 sm:px-8 text-center" tone="elevated">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold mb-3">Check Your Email</h2>
        <p className="text-[15px] leading-7 text-(--text-muted) mb-6">{successMessage}</p>
        <Button variant="secondary" onClick={() => setSuccessMessage(null)}>
          Back to Signup
        </Button>
      </Surface>
    );
  }

  const showPhoneOtpSection = role === "STUDENT" && phone.trim().length >= 8;

  return (
    <Surface className="w-full max-w-[35rem] px-5 py-5 sm:px-6 sm:py-6" tone="elevated">
      <div className="space-y-3">
        <p className="section-eyebrow">Create Account</p>
        <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-balance">
          Build your {role === "MENTOR" ? "mentor" : "student"} workspace in one step.
        </h2>
        <p className="text-[15px] leading-7 text-(--text-muted)">
          The visual system stays consistent. The dashboard you land in adapts to the role you choose here.
        </p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const active = role === option.value;
            return (
              <motion.button
                key={option.value}
                aria-pressed={active}
                className={cx(
                  "group rounded-(--radius-lg) border px-4 py-4 text-left transition-[transform,border-color,background-color,box-shadow] duration-150 ease-out focus-visible:outline-none",
                  active
                    ? "border-(--brand-primary) bg-(--brand-primary-soft) shadow-[0_0_0_4px_rgba(56,193,255,0.12)]"
                    : "border-(--line-soft) bg-white/74 hover:border-(--line-strong) hover:bg-white"
                )}
                onClick={() => setRole(option.value)}
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-(--text-strong)">
                      {option.icon}
                      {option.label}
                    </div>
                    <p className="mt-3 text-[13px] leading-6 text-(--text-muted)">
                      {option.description}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className={cx(
                      "mt-1 h-4 w-4 rounded-full border transition-colors",
                      active
                        ? "border-(--brand-primary) bg-(--brand-primary)"
                        : "border-black/15 bg-transparent"
                    )}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        <Field
          autoComplete="name"
          label="Full Name"
          onChange={(event) => setName(event.target.value)}
          placeholder="Your full name"
          required
          type="text"
          value={name}
        />

        <Field
          autoComplete="email"
          label="Email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />

        {/* Phone field with OTP verification (students only) */}
        <div className="space-y-2">
          <label className="block text-[13.5px] font-medium text-(--text-strong)">
            Phone Number
            {role === "STUDENT" && (
              <span className="ml-1.5 text-[12px] font-normal text-(--text-muted)">
                (Optional — use international format: +91XXXXXXXXXX)
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="phone"
                autoComplete="tel"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                disabled={phoneVerified}
                className={cx(
                  "block w-full rounded-(--radius-md) border px-3.5 py-2.5 text-[14px] text-(--text-strong) placeholder:text-(--text-placeholder) outline-none transition-colors",
                  phoneVerified
                    ? "border-green-400 bg-green-50/60 pr-10"
                    : "border-(--line-soft) bg-(--surface-raised) focus:border-(--brand-primary)"
                )}
              />
              {phoneVerified && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>

            {/* Send OTP / Resend button — only visible for students when phone is entered */}
            {showPhoneOtpSection && !phoneVerified && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpSending || otpCooldown > 0}
                className={cx(
                  "flex shrink-0 items-center gap-1.5 rounded-(--radius-md) border px-3.5 py-2.5 text-[13px] font-semibold transition-all",
                  otpSending || otpCooldown > 0
                    ? "border-(--line-soft) text-(--text-muted) cursor-not-allowed"
                    : "border-(--brand-primary) text-(--brand-primary) hover:bg-(--brand-primary-soft)"
                )}
              >
                {otpSending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : phoneOtpSent && otpCooldown > 0 ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    {otpCooldown}s
                  </>
                ) : (
                  <>
                    <Phone className="h-3.5 w-3.5" />
                    {phoneOtpSent ? "Resend" : "Send via WhatsApp"}
                  </>
                )}
              </button>
            )}

            {/* Change button when already verified */}
            {phoneVerified && (
              <button
                type="button"
                onClick={() => {
                  setPhoneVerified(false);
                  setPhoneVerifiedToken(null);
                  setOtpValue("");
                  setOtpError(null);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-(--radius-md) border border-(--line-soft) px-3.5 py-2.5 text-[13px] font-semibold text-(--text-muted) hover:border-(--line-strong) transition-colors"
              >
                Change
              </button>
            )}
          </div>

          {/* Verified badge */}
          {phoneVerified && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-green-600"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Phone number verified
            </motion.div>
          )}

          {/* OTP input panel */}
          <AnimatePresence>
            {phoneOtpSent && !phoneVerified && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 rounded-[12px] border border-(--line-soft) bg-(--surface-raised) p-4 space-y-3">
                  <p className="text-[13px] text-(--text-muted)">
                    Enter the 6-digit OTP sent to your{" "}
                    <span className="font-semibold text-(--text-strong)">
                      WhatsApp ({phone.trim()})
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <input
                      ref={otpInputRef}
                      id="otp-input"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={otpValue}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setOtpValue(v);
                        setOtpError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleVerifyOtp();
                        }
                      }}
                      placeholder="123456"
                      className="flex-1 rounded-(--radius-md) border border-(--line-soft) bg-white px-3.5 py-2.5 text-[15px] font-mono tracking-widest text-center text-(--text-strong) outline-none focus:border-(--brand-primary) transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifying || otpValue.length !== 6}
                      className={cx(
                        "flex items-center gap-1.5 rounded-(--radius-md) px-4 py-2.5 text-[13px] font-semibold text-white transition-all",
                        otpVerifying || otpValue.length !== 6
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-(--brand-primary) hover:opacity-90 active:scale-[0.98]"
                      )}
                    >
                      {otpVerifying ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </button>
                  </div>
                  {otpError && (
                    <p className="text-[12.5px] text-(--danger) font-medium">{otpError}</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error from send OTP when OTP panel is NOT shown */}
          {otpError && !phoneOtpSent && (
            <p className="text-[12.5px] text-(--danger) font-medium">{otpError}</p>
          )}
        </div>

        <Field
          autoComplete="new-password"
          hint="Minimum eight characters."
          label="Password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create your password"
          required
          type="password"
          value={password}
        />

        {error ? (
          <p className="rounded-(--radius-md) border border-[rgba(255,61,0,0.18)] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[14px] text-(--danger)">
            {error}
          </p>
        ) : null}

        <Button block loading={isSubmitting} size="lg" type="submit">
          {isSubmitting ? "Creating account" : "Create Account"}
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-[13px] text-(--text-subtle)">
        <div className="h-px flex-1 bg-black/[0.08]" />
        <span>Or continue with</span>
        <div className="h-px flex-1 bg-black/[0.08]" />
      </div>

      <a
        className={cx(
          buttonStyles({ variant: "secondary", size: "lg", className: "mt-6 w-full" }),
          "justify-between px-5"
        )}
        href={
          role === "MENTOR"
            ? "/api/auth/google/teacher"
            : "/api/auth/google?action=signup&role=STUDENT"
        }
      >
        <span className="flex items-center gap-3">
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </span>
        <ArrowRight className="h-4 w-4" />
      </a>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-[14px] text-(--text-muted)">
        <span>Already have an account?</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            className="font-semibold text-(--brand-primary-dark) transition-colors hover:text-(--brand-primary)"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="font-semibold text-(--brand-primary-dark) transition-colors hover:text-(--brand-primary)"
            href="/"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </Surface>
  );
}
