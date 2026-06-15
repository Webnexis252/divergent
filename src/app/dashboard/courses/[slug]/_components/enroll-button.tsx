"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2, Sparkles, AlertCircle, ShieldCheck, X } from "lucide-react";
import { PaymentGatewayModal } from "@/app/_components/payment-gateway-modal";

type EnrollmentStatus = "idle" | "loading" | "enrolled" | "error";

export function EnrollButton({
  courseId,
  courseTitle,
  price = 0,
  initialEnrolled,
  maxSeats,
  enrolledCount = 0,
  variant = "default",
  emiPlans,
  expiredInstallment,
}: {
  courseId: string;
  courseTitle: string;
  price?: number;
  initialEnrolled: boolean;
  maxSeats?: number | null;
  enrolledCount?: number;
  variant?: "default" | "detailCard";
  emiPlans?: { label: string; amount: number; dueDays: number }[] | null;
  expiredInstallment?: { currentInstallment: number } | null;
}) {
  const isFull = maxSeats != null && maxSeats > 0 && enrolledCount >= maxSeats;
  const initialStatus = (initialEnrolled && !expiredInstallment) ? "enrolled" : (isFull ? "sold-out" : "idle");

  const [status, setStatus] = useState<EnrollmentStatus | "sold-out">(initialStatus);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number | undefined>(undefined);

  async function handleEnroll() {
    if (status === "loading" || status === "enrolled") return;
    
    if (expiredInstallment) {
      setSelectedInstallmentIndex(expiredInstallment.currentInstallment);
      setIsModalOpen(true);
      return;
    }

    if (price > 0) {
      if (emiPlans && emiPlans.length > 0) {
        setIsChoiceModalOpen(true);
      } else {
        setSelectedInstallmentIndex(undefined);
        setIsModalOpen(true);
      }
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      // Free enrollment logic
      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        if (response.status === 409) {
          setStatus("enrolled");
          return;
        }
        setErrorMessage(json.error ?? "Could not enroll. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("enrolled");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "enrolled") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={
          variant === "detailCard"
            ? "flex h-[37px] items-center justify-center rounded-[10px] border border-[#4caf50]/25 bg-[#f3fff6] px-4 text-center"
            : "flex flex-col items-center gap-3 rounded-[20px] border border-[#16a34a]/20 bg-[#f0fdf4] px-6 py-5"
        }
      >
        {variant === "detailCard" ? (
          <div className="flex items-center gap-2 text-[#15803d]">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-[12px] font-semibold">You&apos;re enrolled</p>
          </div>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[#16a34a] text-white">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1 text-center">
              <p className="text-[15px] font-semibold text-[#15803d]">
                You&apos;re enrolled!
              </p>
              <p className="text-[13px] text-[#16a34a]/80">
                Live classes for &ldquo;{courseTitle}&rdquo; will now appear in your
                dashboard.
              </p>
            </div>
          </>
        )}
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        disabled={status === "loading" || status === "sold-out"}
        onClick={handleEnroll}
        className={
          variant === "detailCard"
            ? "inline-flex h-[44px] w-full items-center justify-center rounded-[12px] bg-[#38c1ff] px-4 text-[14px] font-bold tracking-wide text-white shadow-[0_6px_20px_rgba(56,193,255,0.3)] transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#2db4f0] hover:shadow-[0_10px_24px_rgba(56,193,255,0.4)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 disabled:bg-[#94a3b8] disabled:shadow-none"
            : "inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-(--brand-primary-strong) px-6 text-[16px] font-semibold text-white shadow-[0_14px_34px_rgba(56,193,255,0.22)] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-[1px] hover:bg-(--brand-primary) hover:shadow-[0_18px_44px_rgba(56,193,255,0.32)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 disabled:bg-[#94a3b8] disabled:shadow-none"
        }
      >
        <AnimatePresence mode="wait">
          {status === "loading" ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={variant === "detailCard" ? "flex items-center gap-1.5" : "flex items-center gap-2"}
            >
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              {price > 0 ? "Processing..." : "Enrolling..."}
            </motion.span>
          ) : status === "sold-out" ? (
            <motion.span
              key="sold-out"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={variant === "detailCard" ? "flex items-center gap-1.5" : "flex items-center gap-2"}
            >
              Enrollment Full
            </motion.span>
          ) : (
            <motion.span
              key="cta"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={variant === "detailCard" ? "flex items-center gap-1.5" : "flex items-center gap-2"}
            >
              {variant === "detailCard" ? null : (
                price > 0 ? <ShieldCheck className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />
              )}
              {variant === "detailCard"
                ? (expiredInstallment ? "Pay Instalment" : "Enroll Now")
                : expiredInstallment
                  ? `Pay Instalment ₹${emiPlans?.[expiredInstallment.currentInstallment]?.amount.toLocaleString("en-IN")}`
                  : price > 0
                    ? `Pay ₹${price.toLocaleString("en-IN")}`
                    : "Enroll Now — Free"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {status === "error" && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-[14px] border border-red-200 bg-red-50 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-[13px] leading-5 text-red-700">{errorMessage}</p>
        </motion.div>
      )}

      <PaymentGatewayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseId={courseId}
        installmentIndex={selectedInstallmentIndex}
        onSuccess={() => {
          setIsModalOpen(false);
          setStatus("enrolled");
          window.location.href = "/payment/status?status=success";
        }}
        onError={(msg) => {
          setIsModalOpen(false);
          setErrorMessage(msg);
          setStatus("error");
          window.location.href = `/payment/status?status=failed&message=${encodeURIComponent(msg)}`;
        }}
      />

      <AnimatePresence>
        {isChoiceModalOpen && emiPlans && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl relative"
            >
              <button
                onClick={() => setIsChoiceModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="px-6 pb-6 pt-8">
                <h2 className="text-[20px] font-bold text-gray-900 mb-2">Select Payment Option</h2>
                <p className="text-[14px] text-gray-500 mb-6">
                  You can pay the full amount now, or pay in installments.
                </p>

                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => {
                      setSelectedInstallmentIndex(undefined);
                      setIsChoiceModalOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-[16px] border-[2px] border-gray-100 hover:border-[#38c1ff] hover:bg-[#f3faff] p-4 transition-all text-left"
                  >
                    <div>
                      <p className="text-[15px] font-bold text-gray-900">One Time Payment</p>
                      <p className="text-[13px] text-gray-500">Pay the full course fee</p>
                    </div>
                    <p className="text-[18px] font-extrabold text-[#38c1ff]">₹{price?.toLocaleString("en-IN")}</p>
                  </button>

                  <div className="relative pt-3 pb-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100" />
                    </div>
                    <div className="relative flex justify-center text-[12px]">
                      <span className="bg-white px-3 font-semibold text-gray-400">OR INSTALLMENTS</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedInstallmentIndex(0);
                      setIsChoiceModalOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="flex w-full items-center justify-between gap-4 rounded-[16px] border-[2px] border-purple-100 bg-purple-50 hover:border-purple-300 hover:bg-purple-100 p-4 transition-all text-left"
                  >
                    <div>
                      <p className="text-[15px] font-bold text-purple-900">Pay First Installment</p>
                      <p className="text-[13px] text-purple-700">{emiPlans.length} easy installments</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-extrabold text-purple-700">₹{emiPlans[0].amount.toLocaleString("en-IN")}</p>
                      <p className="text-[11px] font-semibold text-purple-500">Valid for {emiPlans[0].dueDays} days</p>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
