"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "@/context/auth-context";
import {
  Loader2,
  Camera,
  Check,
  LogOut,
  Pencil,
  X,
  Phone,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { cx } from "@/lib/cx";
import Image from "next/image";

const OTP_COOLDOWN_SECS = 60;

export function SettingsForm() {
  const { user, refreshUser, logout } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // --- Phone change states ---
  const [currentPhone, setCurrentPhone] = useState<string>("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [phoneUpdateSuccess, setPhoneUpdateSuccess] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch full user profile (including phone) on mount
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.phone) {
          setCurrentPhone(json.data.phone);
        }
      })
      .catch(() => {});
  }, []);

  // Reset OTP flow when new phone changes
  useEffect(() => {
    if (phoneOtpSent) {
      setPhoneOtpSent(false);
      setOtpValue("");
      setOtpError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPhone]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

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

  const handleSendOtp = async () => {
    setOtpError(null);
    setOtpSending(true);
    try {
      const res = await fetch("/api/auth/phone-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone.trim(), context: "SETTINGS" }),
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
        body: JSON.stringify({
          phone: newPhone.trim(),
          otp: otpValue,
          context: "SETTINGS",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setOtpError(json.error ?? "Invalid OTP. Please try again.");
        return;
      }
      // Phone has been updated in the DB by the verify endpoint
      setCurrentPhone(newPhone.trim());
      setEditingPhone(false);
      setNewPhone("");
      setOtpValue("");
      setPhoneOtpSent(false);
      setPhoneUpdateSuccess(true);
      setTimeout(() => setPhoneUpdateSuccess(false), 4000);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const cancelPhoneEdit = () => {
    setEditingPhone(false);
    setNewPhone("");
    setPhoneOtpSent(false);
    setOtpValue("");
    setOtpError(null);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setOtpCooldown(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      await refreshUser();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const showSendOtp = newPhone.trim().length >= 8;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-[28px] font-bold tracking-tight text-[#0f172a]">Settings</h2>
        <p className="mt-2 text-[15px] text-gray-500">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Form */}
      <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-gray-50 bg-gray-100 shadow-inner">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt={user.name || "Avatar"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[32px] font-bold text-gray-300">
                  {(user?.name || "U").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#925fe2] focus:ring-offset-2"
              >
                <Camera className="h-4 w-4" />
                Change Avatar
              </button>
              <p className="mt-2 text-[13px] text-gray-500">JPG, GIF or PNG. Max size of 2MB.</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Full Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="block text-[14px] font-semibold text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 focus:border-[#925fe2] focus:outline-none focus:ring-1 focus:ring-[#925fe2]"
                placeholder="Jane Doe"
              />
            </div>

            {/* Email — read-only */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[14px] font-semibold text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={user?.email || ""}
                disabled
                className="block w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[15px] text-gray-500 focus:outline-none"
              />
              <p className="text-[12px] text-gray-400">Email cannot be changed.</p>
            </div>

            {/* Phone Number — with OTP verification */}
            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="block text-[14px] font-semibold text-gray-700">
                  Phone Number
                </label>
                {phoneUpdateSuccess && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-green-600"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Phone updated!
                  </motion.span>
                )}
              </div>

              {/* Current phone display */}
              {!editingPhone ? (
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-[15px] text-gray-700 flex-1">
                      {currentPhone || (
                        <span className="text-gray-400 italic">No phone number added</span>
                      )}
                    </span>
                    {currentPhone && (
                      <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPhone(true);
                      setNewPhone(currentPhone || "");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {currentPhone ? "Change" : "Add Phone"}
                  </button>
                </div>
              ) : (
                <div className="rounded-[16px] border border-[#925fe2]/30 bg-purple-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] font-semibold text-[#6d3ebd]">
                      Verify new phone number
                    </p>
                    <button
                      type="button"
                      onClick={cancelPhoneEdit}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-[12.5px] text-gray-500">
                    Enter in international format, e.g. <strong>+91XXXXXXXXXX</strong>
                  </p>

                  {/* New phone input + Send OTP */}
                  <div className="flex gap-2">
                    <input
                      id="new-phone"
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91XXXXXXXXXX"
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[14px] text-gray-900 placeholder-gray-400 focus:border-[#925fe2] focus:outline-none focus:ring-1 focus:ring-[#925fe2]"
                    />
                    {showSendOtp && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={otpSending || otpCooldown > 0}
                        className={cx(
                          "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold transition-all",
                          otpSending || otpCooldown > 0
                            ? "border border-gray-200 text-gray-400 cursor-not-allowed bg-white"
                            : "bg-[#925fe2] text-white hover:bg-[#7b4dce]"
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
                  </div>

                  {/* OTP entry panel */}
                  <AnimatePresence>
                    {phoneOtpSent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 space-y-2">
                          <p className="text-[12.5px] text-gray-500">
                            OTP sent to your WhatsApp — enter the 6-digit code below.
                          </p>
                          <div className="flex gap-2">
                            <input
                              ref={otpInputRef}
                              id="settings-otp-input"
                              type="text"
                              inputMode="numeric"
                              pattern="\d{6}"
                              maxLength={6}
                              value={otpValue}
                              onChange={(e) => {
                                setOtpValue(e.target.value.replace(/\D/g, ""));
                                setOtpError(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleVerifyOtp();
                                }
                              }}
                              placeholder="123456"
                              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[15px] font-mono tracking-widest text-center text-gray-900 focus:border-[#925fe2] focus:outline-none focus:ring-1 focus:ring-[#925fe2]"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={otpVerifying || otpValue.length !== 6}
                              className={cx(
                                "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all",
                                otpVerifying || otpValue.length !== 6
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-[#925fe2] hover:bg-[#7b4dce] active:scale-[0.98]"
                              )}
                            >
                              {otpVerifying ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Verify & Save"
                              )}
                            </button>
                          </div>
                          {otpError && (
                            <p className="text-[12.5px] text-red-500 font-medium">{otpError}</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {otpError && !phoneOtpSent && (
                    <p className="text-[12.5px] text-red-500 font-medium">{otpError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-4 text-[14px] font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isLoading}
              className={cx(
                "inline-flex items-center justify-center gap-2 rounded-full bg-[#925fe2] px-6 py-3 text-[15px] font-semibold text-white transition-all hover:bg-[#7b4dce] focus:outline-none focus:ring-2 focus:ring-[#925fe2] focus:ring-offset-2",
                isLoading && "opacity-70"
              )}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>

            {isSuccess && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-[14px] font-medium text-green-600"
              >
                <Check className="h-4 w-4" />
                Settings updated successfully
              </motion.div>
            )}
          </div>
        </form>
      </div>

      {/* Account Actions */}
      <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8 mt-8">
        <h3 className="text-[18px] font-semibold tracking-tight text-[#0f172a]">Account Actions</h3>
        <p className="mt-1 text-[14px] text-gray-500 mb-6">Log out of your account on this device.</p>
        <button
          onClick={() => logout()}
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-6 py-3 text-[15px] font-semibold text-red-600 transition-all hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
