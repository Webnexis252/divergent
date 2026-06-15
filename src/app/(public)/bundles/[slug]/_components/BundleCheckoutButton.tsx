"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, Sparkles, ShieldCheck, X } from "lucide-react";
import { PaymentGatewayModal } from "@/app/_components/payment-gateway-modal";

import { cx } from "@/lib/cx";

export function BundleCheckoutButton({ 
  bundleId, 
  userId, 
  className,
  price,
  emiPlans,
  expiredInstallment,
}: { 
  bundleId: string; 
  userId?: string; 
  className?: string;
  price?: number;
  emiPlans?: { label: string; amount: number; dueDays: number }[] | null;
  expiredInstallment?: { currentInstallment: number } | null;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [selectedInstallmentIndex, setSelectedInstallmentIndex] = useState<number | undefined>(undefined);
  const router = useRouter();

  const handleCheckout = () => {
    if (!userId) {
      // Redirect to login if not logged in
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?redirect=${returnUrl}`);
      return;
    }

    if (expiredInstallment) {
      setSelectedInstallmentIndex(expiredInstallment.currentInstallment);
      setIsModalOpen(true);
      return;
    }

    if ((price || 0) > 0 && emiPlans && emiPlans.length > 0) {
      setIsChoiceModalOpen(true);
    } else {
      setSelectedInstallmentIndex(undefined);
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cx(
          "inline-flex h-[44px] w-full items-center justify-center gap-1.5 rounded-[12px] bg-[#38c1ff] px-4 text-[14px] font-bold tracking-wide text-white shadow-[0_6px_20px_rgba(56,193,255,0.3)] transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#2db4f0] hover:shadow-[0_10px_24px_rgba(56,193,255,0.4)] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60 disabled:bg-[#94a3b8] disabled:shadow-none",
          className
        )}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.span
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </motion.span>
          ) : (
            <motion.span
              key="cta"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              {(price || 0) > 0 ? <ShieldCheck className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5" />}
              {expiredInstallment ? "Pay Instalment" : "Enroll Now"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <PaymentGatewayModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setLoading(false);
        }}
        bundleId={bundleId}
        installmentIndex={selectedInstallmentIndex}
        onSuccess={() => {
          setIsModalOpen(false);
          setLoading(false);
          window.location.href = `/payment/status?status=success`;
        }}
        onError={(msg) => {
          setIsModalOpen(false);
          setLoading(false);
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
                      <p className="text-[13px] text-gray-500">Pay the full bundle fee</p>
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
    </>
  );
}
