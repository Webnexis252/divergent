"use client";

import { AnimatePresence, m as motion } from "motion/react";
import { Check, X } from "lucide-react";

/** Bottom-right confirmation toast used across admin pages. */
export function AdminToast({ toast }: { toast: { msg: string; ok: boolean } | null }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-[14px] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)] ${
            toast.ok ? "bg-[#15803d]" : "bg-[#b91c1c]"
          }`}
        >
          {toast.ok ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <X className="h-4 w-4 shrink-0" aria-hidden="true" />}
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
