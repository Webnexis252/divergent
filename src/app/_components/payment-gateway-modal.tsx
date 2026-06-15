"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CreditCard, ShieldCheck, Loader2 } from "lucide-react";
import { load } from "@cashfreepayments/cashfree-js";

export type PaymentGatewayModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  courseId?: string;
  bundleId?: string;
  installmentIndex?: number;
  planId?: string;
};

// Simple utility to load Razorpay script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentGatewayModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  courseId,
  bundleId,
  installmentIndex,
  planId,
}: PaymentGatewayModalProps) {
  const [selectedGateway, setSelectedGateway] = useState<"CASHFREE" | "RAZORPAY">("CASHFREE");
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; finalPrice: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // If installment is > 0, we do not allow coupons (user requested "only first installment")
  const isCouponAllowed = typeof installmentIndex !== "number" || installmentIndex === 0;

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    setAppliedCoupon(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          courseId,
          bundleId,
          installmentIndex,
          planId
        })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCouponError(json.error || "Invalid coupon code");
      } else {
        setAppliedCoupon({
          code: json.data.code,
          discountAmount: json.data.discountAmount,
          finalPrice: json.data.finalPrice
        });
        setCouponError("");
      }
    } catch (err: any) {
      setCouponError("Failed to validate coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  async function handleProceed() {
    setIsLoading(true);
    
    try {
      const endpoint = selectedGateway === "CASHFREE" 
        ? "/api/payments/create-order" 
        : "/api/payments/razorpay/create-order";

      const payload: any = courseId ? { courseId } : { bundleId };
      if (planId) {
        payload.planId = planId;
      }
      if (typeof installmentIndex === 'number') {
        payload.installmentIndex = installmentIndex;
      }
      if (appliedCoupon?.code) {
        payload.couponCode = appliedCoupon.code;
      }
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Could not initiate payment.");
      }

      if (json.data?.bypassPayment) {
        onSuccess();
        return;
      }

      if (selectedGateway === "CASHFREE") {
        const { payment_session_id, cashfree_environment } = json.data;
        const mode = cashfree_environment === "production" ? "production" : "sandbox";
        const cashfree = await load({ mode });

        const result = await cashfree.checkout({
          paymentSessionId: payment_session_id,
          redirectTarget: "_modal",
        });

        if (result?.error) {
          throw new Error(result.error.message ?? "Payment failed or cancelled.");
        }
        
        // Verify Cashfree
        const verifyRes = await fetch("/api/payments/verify-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: json.data.order_id, courseId, bundleId }),
        });
        const verifyJson = await verifyRes.json();
        if (verifyRes.ok && verifyJson.success) {
          setIsLoading(false);
          onSuccess();
        } else {
          throw new Error(verifyJson.error ?? "Payment verification failed.");
        }

      } else {
        // Razorpay flow
        const isLoaded = await loadRazorpayScript();
        if (!isLoaded) throw new Error("Failed to load Razorpay. Please check your connection.");

        const { order_id, amount, currency, key_id, user_name, user_email, user_phone } = json.data;

        const options = {
          key: key_id,
          amount,
          currency,
          name: "Divergent Classes",
          description: "Course Enrollment",
          order_id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch("/api/payments/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  courseId,
                  bundleId
                }),
              });
              const verifyJson = await verifyRes.json();
              if (verifyRes.ok && verifyJson.success) {
                onSuccess();
              } else {
                throw new Error(verifyJson.error ?? "Payment verification failed.");
              }
            } catch (err: any) {
              onError(err.message || "Payment verification failed.");
              setIsLoading(false);
            }
          },
          prefill: {
            name: user_name,
            email: user_email,
            contact: user_phone,
          },
          theme: {
            color: "#38c1ff",
          },
          modal: {
            ondismiss: function () {
              setIsLoading(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          onError(response.error.description || "Payment failed");
        });
        rzp.open();
        // Don't set loading false immediately since overlay is open
        return;
      }
    } catch (err: any) {
      onError(err.message || "Something went wrong.");
      setIsLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl relative"
        >
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="px-6 pb-6 pt-8">
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">Select Payment Method</h2>
            <p className="text-[14px] text-gray-500 mb-4">
              Choose how you'd like to pay for this enrollment securely.
            </p>

            {isCouponAllowed && (
              <div className="mb-6 rounded-[16px] bg-gray-50 p-4 border border-gray-100">
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">Have a discount code?</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                    placeholder="Enter code"
                    className="h-10 w-full rounded-[10px] border border-gray-200 px-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20 uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !couponCode.trim()}
                    className="h-10 shrink-0 rounded-[10px] bg-gray-900 px-4 text-[13px] font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isApplyingCoupon ? "..." : "Apply"}
                  </button>
                </div>
                {couponError && <p className="mt-2 text-[12px] text-red-500">{couponError}</p>}
                {appliedCoupon && (
                  <div className="mt-2 text-[13px] font-medium text-green-600 flex items-center justify-between">
                    <span>Code applied! -₹{appliedCoupon.discountAmount} off</span>
                    <button 
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                      className="text-gray-400 hover:text-gray-600 underline text-[12px]"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {appliedCoupon?.finalPrice === 0 ? (
              <div className="mb-8 rounded-[16px] bg-green-50 p-4 border border-green-100 text-center">
                <ShieldCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-[15px] font-bold text-green-900">100% Free with Coupon</p>
                <p className="text-[13px] text-green-700 mt-1">No payment required. Proceed to enroll.</p>
              </div>
            ) : (
              <div className="space-y-3 mb-8">
              {/* Cashfree Option */}
              <button
                onClick={() => setSelectedGateway("CASHFREE")}
                className={`flex w-full items-center gap-4 rounded-[16px] border-[2px] p-4 transition-all ${
                  selectedGateway === "CASHFREE" 
                    ? "border-blue-500 bg-blue-50 shadow-[0_4px_12px_rgba(59,130,246,0.1)]" 
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selectedGateway === "CASHFREE" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={`text-[15px] font-bold ${selectedGateway === "CASHFREE" ? "text-blue-900" : "text-gray-900"}`}>Cashfree Payments</p>
                  <p className="text-[13px] text-gray-500">Credit, Debit, Netbanking, UPI</p>
                </div>
              </button>

              {/* Razorpay Option */}
              <button
                onClick={() => setSelectedGateway("RAZORPAY")}
                className={`flex w-full items-center gap-4 rounded-[16px] border-[2px] p-4 transition-all ${
                  selectedGateway === "RAZORPAY" 
                    ? "border-blue-500 bg-blue-50 shadow-[0_4px_12px_rgba(59,130,246,0.1)]" 
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selectedGateway === "RAZORPAY" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={`text-[15px] font-bold ${selectedGateway === "RAZORPAY" ? "text-blue-900" : "text-gray-900"}`}>Razorpay</p>
                  <p className="text-[13px] text-gray-500">Cards, Wallets, EMI, UPI</p>
                </div>
              </button>
            </div>
            )}

            <button
              disabled={isLoading}
              onClick={handleProceed}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#38c1ff] py-3.5 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(56,193,255,0.4)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(56,193,255,0.5)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : appliedCoupon?.finalPrice === 0 ? (
                "Enroll Now"
              ) : (
                `Proceed to Pay ${appliedCoupon ? `₹${appliedCoupon.finalPrice}` : ''}`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
