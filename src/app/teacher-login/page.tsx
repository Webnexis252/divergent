"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Eye, EyeOff, KeyRound, Lock, AlertTriangle } from "lucide-react";

type Tab = "otp" | "password";

function TeacherLoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const emailParam = searchParams.get("email") ?? "";

  const [tab, setTab] = useState<Tab>("otp");
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (statusParam === "google_linked") {
      setError(null);
      // Pre-filled email from Google — tell teacher to use OTP
    }
  }, [statusParam]);

  // ── OTP Login
  const handleOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !otp.trim()) { setError("Email and OTP are required."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/teacher-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? "Login failed. Please check your OTP."); return; }
      router.push("/dashboard/teacher/overview");
      router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  // ── Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Email and password are required."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json();
      if (!json.success) { setError(json.error ?? "Login failed. Check your credentials."); return; }
      router.push("/dashboard/teacher/overview");
      router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4 py-12">
      {/* Ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -left-40 top-20 h-[500px] w-[500px] rounded-full bg-[#facc15]/15 blur-[120px]" />
        <motion.div animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute -right-40 bottom-20 h-[500px] w-[500px] rounded-full bg-[#38c1ff]/15 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[460px]"
      >
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_32px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          {/* Header */}
          <div className="border-b border-white/10 px-8 py-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid grid-cols-2 gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-2 w-2 rounded-full ${i % 2 === 0 ? "bg-[#38c1ff]" : "bg-[#facc15]"}`} />
                ))}
              </div>
              <span className="font-bold text-white">Divergent Classes</span>
            </div>
            <h1 className="text-[26px] font-bold text-white">Teacher Login</h1>
            <p className="mt-1.5 text-[14px] text-white/50">
              Login with your activation OTP or admin-set password.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mx-8 mt-6 flex rounded-[14px] border border-white/10 bg-white/5 p-1">
            {(["otp", "password"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] py-2.5 text-[13px] font-semibold transition-all ${
                  tab === t
                    ? "bg-[#38c1ff] text-white shadow-lg shadow-[#38c1ff]/20"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                {t === "otp" ? <KeyRound className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {t === "otp" ? "OTP Login" : "Password Login"}
              </button>
            ))}
          </div>

          <div className="px-8 py-6">
            {error && (
              <motion.div
                key={error}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-start gap-2 rounded-[12px] bg-red-500/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-300"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </motion.div>
            )}

            {/* Email field — shared */}
            <div className="mb-4">
              <label className="mb-1.5 block text-[13px] font-semibold text-white/70">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="your@email.com"
                className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 text-[14px] text-white placeholder-white/25 outline-none focus:border-[#38c1ff]/60 focus:ring-2 focus:ring-[#38c1ff]/20 transition"
              />
            </div>

            <AnimatePresence mode="wait">
              {tab === "otp" ? (
                <motion.form
                  key="otp-form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  onSubmit={handleOtpLogin}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-white/70">Activation OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                      placeholder="6-digit OTP"
                      className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 text-center text-[22px] font-bold tracking-[0.4em] text-[#facc15] placeholder-white/20 outline-none focus:border-[#facc15]/60 focus:ring-2 focus:ring-[#facc15]/20 transition"
                    />
                    <p className="mt-1.5 text-[12px] text-white/35">
                      Enter the 6-digit OTP from your activation email. OTPs expire in 15 minutes.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#facc15] py-3.5 text-[15px] font-bold text-[#1a1a1a] shadow-lg shadow-[#facc15]/20 transition hover:bg-[#eab308] active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Verifying…" : "Verify OTP & Login"}
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="pw-form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  onSubmit={handlePasswordLogin}
                  className="space-y-4"
                >
                  <div>
                    <label className="mb-1.5 block text-[13px] font-semibold text-white/70">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="Password set by your admin"
                        className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-3 pr-12 text-[14px] text-white placeholder-white/25 outline-none focus:border-[#38c1ff]/60 focus:ring-2 focus:ring-[#38c1ff]/20 transition"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[12px] text-white/35">
                      Use the password provided to you by your admin.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[#38c1ff] py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#38c1ff]/20 transition hover:bg-[#0ea5e9] active:scale-[0.98] disabled:opacity-60"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Logging in…" : "Login"}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-8 py-4 text-center text-[13px] text-white/40">
            Not registered yet?{" "}
            <Link href="/teacher-register" className="font-semibold text-[#38c1ff] hover:underline">
              Register as Teacher →
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function TeacherLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
      <Loader2 className="h-8 w-8 animate-spin text-[#38c1ff]" />
    </div>}>
      <TeacherLoginInner />
    </Suspense>
  );
}
