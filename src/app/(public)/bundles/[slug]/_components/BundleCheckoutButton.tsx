"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PaymentGatewayModal } from "@/app/_components/payment-gateway-modal";

import { cx } from "@/lib/cx";

export function BundleCheckoutButton({ bundleId, userId, className }: { bundleId: string; userId?: string; className?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = () => {
    if (!userId) {
      // Redirect to login if not logged in
      const returnUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?redirect=${returnUrl}`);
      return;
    }
    // Open the payment gateway selection modal directly.
    // The modal handles all payment logic (create-order, checkout, verify).
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={cx(
          "w-full flex items-center justify-center gap-2 rounded-[14px] bg-[#38c1ff] py-3.5 text-[15px] font-bold text-white transition hover:bg-[#2db4f0] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 shadow-[0_6px_20px_rgba(56,193,255,0.3)]",
          className
        )}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enroll Now"}
      </button>

      <PaymentGatewayModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setLoading(false);
        }}
        bundleId={bundleId}
        onSuccess={() => {
          setIsModalOpen(false);
          setLoading(false);
          router.push(`/dashboard/courses`);
        }}
        onError={(msg) => {
          setIsModalOpen(false);
          setLoading(false);
          alert(msg);
        }}
      />
    </>
  );
}
