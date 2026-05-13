"use client";

import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import teacherRegisterBrand from "@/assets/images/teacher-register-brand.png";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function TeacherRegisterInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const errorParam = searchParams.get("error");
  const emailParam = searchParams.get("email");
  const nameParam = searchParams.get("name");

  const [form, setForm] = useState({ name: nameParam ?? "", email: emailParam ?? "", password: "", phone: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(status === "pending");
  const [error, setError] = useState<string | null>(null);

  const errorMessages: Record<string, string> = {
    oauth_cancelled: "Google sign-in was cancelled.",
    oauth_not_configured: "Google OAuth is not yet configured. Please register with email below.",
    token_exchange_failed: "Failed to connect to Google. Please try again.",
    email_not_verified: "Your Google account's email is not verified.",
    not_a_teacher_account: "This Google account is registered as a student or admin, not a teacher.",
    server_error: "Something went wrong. Please try again.",
  };

  useEffect(() => {
    if (errorParam) setError(errorMessages[errorParam] ?? "An error occurred.");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorParam]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Registration failed. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4 py-12">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[#38c1ff]/20 blur-[120px]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute -right-40 bottom-20 h-[500px] w-[500px] rounded-full bg-[#7c3aed]/20 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[480px]"
      >
        {/* Card */}
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          {/* Header */}
          <div className="border-b border-white/10 px-8 py-7">
            <div className="mb-5 inline-flex max-w-full">
              <Image
                alt="Divergent Classes"
                className="h-auto w-[160px] max-w-full object-contain sm:w-[176px]"
                priority
                src={teacherRegisterBrand}
              />
            </div>
            <h1 className="text-[26px] font-bold text-white">Teacher Registration</h1>
            <p className="mt-1.5 text-[14px] text-white/50">
              Create your teacher account. An admin will review and send you an activation OTP.
            </p>
          </div>

          <div className="px-8 py-7">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-5"
                >
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#22c55e]/15 border-2 border-[#22c55e]/30">
                    <CheckCircle2 className="h-10 w-10 text-[#22c55e]" />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-bold text-white">Registration Received!</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-white/60">
                      Your teacher account is now <strong className="text-[#facc15]">pending admin approval</strong>.
                      Once an admin activates it, you&apos;ll receive a 6-digit OTP to your email.
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-[#38c1ff]/10 border border-[#38c1ff]/20 px-4 py-3 text-[13px] text-[#38c1ff] text-left">
                    <p className="font-semibold mb-1">Next Steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-white/70">
                      <li>Wait for your admin to approve your account</li>
                      <li>You&apos;ll receive an OTP via email</li>
                      <li>Go to <strong>/teacher-login</strong> and enter your email + OTP</li>
                    </ol>
                  </div>
                  <Link href="/teacher-login"
                    className="flex items-center justify-center gap-2 rounded-[14px] bg-[#38c1ff] px-6 py-3 text-[14px] font-bold text-white transition hover:bg-[#0ea5e9]">
                    Go to Teacher Login →
                  </Link>
                </motion.div>
              ) : (
                <motion.div key="form">
                  {/* Google OAuth Button */}
                  <a
                    href="/api/auth/google/teacher"
                    className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-white/15 bg-white/10 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-white/15 active:scale-[0.98]"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </a>

                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[12px] text-white/30">or register with email</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 flex items-start gap-2 rounded-[12px] bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-300"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                      { label: "Full Name", name: "name", type: "text", placeholder: "Ravi Kumar" },
                      { label: "Email", name: "email", type: "email", placeholder: "teacher@school.com" },
                      { label: "Phone (optional)", name: "phone", type: "tel", placeholder: "+91 9876543210" },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="mb-1.5 block text-[13px] font-semibold text-white/70">{field.label}</label>
                        <input
                          type={field.type}
                          name={field.name}
                          value={form[field.name as keyof typeof form]}
                          onChange={handleChange}
                          placeholder={field.placeholder}
                          className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none focus:border-[#38c1ff]/60 focus:ring-2 focus:ring-[#38c1ff]/20 transition"
                        />
                      </div>
                    ))}

                    {/* Password */}
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-white/70">Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          name="password"
                          value={form.password}
                          onChange={handleChange}
                          placeholder="Min 8 chars, 1 uppercase, 1 number"
                          className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 pr-12 text-[14px] text-white placeholder-white/25 outline-none focus:border-[#38c1ff]/60 focus:ring-2 focus:ring-[#38c1ff]/20 transition"
                        />
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#38c1ff] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#38c1ff]/25 transition hover:bg-[#0ea5e9] active:scale-[0.98] disabled:opacity-60"
                    >
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      {loading ? "Registering…" : "Register as Teacher"}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!success && (
            <div className="border-t border-white/10 px-8 py-4 text-center text-[13px] text-white/40">
              Already activated?{" "}
              <Link href="/teacher-login" className="font-semibold text-[#38c1ff] hover:underline">
                Login with OTP →
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function TeacherRegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
      <Loader2 className="h-8 w-8 animate-spin text-[#38c1ff]" />
    </div>}>
      <TeacherRegisterInner />
    </Suspense>
  );
}
