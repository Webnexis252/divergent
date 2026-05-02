"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/context/auth-context";
import { Loader2, Camera, Check } from "lucide-react";
import { cx } from "@/lib/cx";
import Image from "next/image";

export function SettingsForm() {
  const { user, refreshUser } = useAuth();
  
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(""); // Defaulting to empty since context doesn't have phone, but the profile might.
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update profile");
      }

      await refreshUser();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-[28px] font-bold tracking-tight text-[#0f172a]">Settings</h2>
        <p className="mt-2 text-[15px] text-gray-500">
          Manage your account settings and preferences.
        </p>
      </div>

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
              <p className="mt-2 text-[13px] text-gray-500">
                JPG, GIF or PNG. Max size of 2MB.
              </p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
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
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="phone" className="block text-[14px] font-semibold text-gray-700">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-[15px] text-gray-900 placeholder-gray-400 focus:border-[#925fe2] focus:outline-none focus:ring-1 focus:ring-[#925fe2]"
                placeholder="+1 (555) 000-0000"
              />
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
    </div>
  );
}
