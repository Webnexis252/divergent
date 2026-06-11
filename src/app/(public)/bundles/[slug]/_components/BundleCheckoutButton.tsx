"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { load } from "@cashfreepayments/cashfree-js";
import { Loader2 } from "lucide-react";

import { cx } from "@/lib/cx";

export function BundleCheckoutButton({ bundleId, userId, className }: { bundleId: string; userId?: string; className?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCheckout = async () => {
    if (!userId) {
      // Redirect to login if not logged in
      const returnUrl = encodeURIComponent(`/bundles/${bundleId}`);
      router.push(`/login?redirect=${returnUrl}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error ?? "Failed to initiate payment");
        setLoading(false);
        return;
      }

      if (data.data?.bypassPayment) {
        alert("Enrolled successfully (Free / Bypassed)!");
        router.push("/dashboard");
        return;
      }

      // Initialize Cashfree
      const cashfree = await load({
        mode: data.data.cashfree_environment,
      });

      // Redirect to Cashfree checkout
      cashfree.checkout({
        paymentSessionId: data.data.payment_session_id,
        returnUrl: `${window.location.origin}/api/payments/callback?order_id={order_id}`,
      });
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={cx(
        "w-full flex items-center justify-center gap-2 rounded-[14px] bg-[#7c3aed] py-3.5 text-[15px] font-bold text-white transition hover:bg-[#6d28d9] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:-translate-y-0",
        className
      )}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enroll Now"}
    </button>
  );
}
