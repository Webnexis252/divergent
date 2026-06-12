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
}: PaymentGatewayModalProps) {
  const [selectedGateway, setSelectedGateway] = useState<"CASHFREE" | "RAZORPAY">("CASHFREE");
  const [isLoading, setIsLoading] = useState(false);

  async function handleProceed() {
    setIsLoading(true);
    
    try {
      const endpoint = selectedGateway === "CASHFREE" 
        ? "/api/payments/create-order" 
        : "/api/payments/razorpay/create-order";

      const payload = courseId ? { courseId } : { bundleId };
      
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
            <p className="text-[14px] text-gray-500 mb-6">
              Choose how you'd like to pay for this enrollment securely.
            </p>

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
              ) : (
                `Proceed to Pay`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
