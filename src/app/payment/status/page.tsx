"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { motion } from "motion/react";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

function PaymentStatusContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const message = searchParams.get("message");
  
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const isSuccess = status === "success";

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
        className="w-full max-w-md overflow-hidden rounded-[24px] bg-white p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        >
          {isSuccess ? (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-green-100 text-green-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-red-100 text-red-500">
              <XCircle className="h-10 w-10" />
            </div>
          )}
        </motion.div>

        <h1 className="mb-2 text-[24px] font-bold text-gray-900">
          {isSuccess ? "Payment Successful!" : "Payment Failed"}
        </h1>
        
        <p className="mb-8 text-[15px] leading-relaxed text-gray-500">
          {isSuccess 
            ? "Your payment has been processed successfully. You now have full access to your content." 
            : message || "Unfortunately, we could not process your payment at this time. Please try again or use a different payment method."}
        </p>

        <div className="flex flex-col gap-3">
          {isSuccess ? (
            <Link
              href="/dashboard/courses"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95"
            >
              Go to My Courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/dashboard/courses"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-900 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-gray-200 transition-all hover:bg-black hover:shadow-xl active:scale-95"
            >
              Back to Courses
            </Link>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function PaymentStatusPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      }>
        <PaymentStatusContent />
      </Suspense>
    </div>
  );
}
