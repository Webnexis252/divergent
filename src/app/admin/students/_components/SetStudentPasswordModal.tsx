"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, X, Loader2, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

export function SetStudentPasswordModal({
  studentId, studentName, studentEmail, onClose, onSuccess,
}: {
  studentId: string; studentName: string | null; studentEmail: string | null;
  onClose: () => void; onSuccess?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Minimum 8 characters."); return; }
    if (!/[A-Z]/.test(password)) { setError("Needs 1 uppercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Needs 1 number."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/set-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed");
      setDone(true); setTimeout(() => { onSuccess?.(); onClose(); }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        className="w-full max-w-[420px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0f0f5] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#38c1ff]/15">
              <Lock className="h-5 w-5 text-[#38c1ff]" />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#111827]">Set Password</h2>
              <p className="text-[12px] text-[#9ca3af]">{studentName ?? studentEmail}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4 space-y-3">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#22c55e]" />
                <p className="text-[15px] font-semibold text-[#111827]">Password set!</p>
                <p className="text-[13px] text-[#9ca3af]">Student can login at <strong>/login</strong>.</p>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={handleSave} className="space-y-4">
                {error && <div className="flex items-center gap-2 rounded-[12px] bg-red-50 border border-red-100 px-4 py-3 text-[13px] text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
                
                {[{ label: "New Password", v: password, set: setPassword }, { label: "Confirm Password", v: confirm, set: setConfirm }].map(({ label, v, set }) => (
                  <div key={label}>
                    <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">{label}</label>
                    <div className="relative">
                      <input type={showPw ? "text" : "password"} value={v}
                        onChange={(e) => { set(e.target.value); setError(null); }}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 pr-11 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100" />
                      {label === "New Password" && (
                        <button type="button" onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]">
                          {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={onClose} className="flex-1 rounded-[12px] border border-[#e5e7eb] py-3 text-[13px] font-semibold text-[#6b7280] hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#38c1ff] py-3 text-[13px] font-bold text-white hover:bg-[#0ea5e9] disabled:opacity-60">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Saving…" : "Set Password"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
