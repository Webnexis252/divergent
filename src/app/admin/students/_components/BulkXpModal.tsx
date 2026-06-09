"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkXpModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number | "ALL";
  onSubmit: (direction: "ADD" | "REMOVE", amount: number, note?: string) => Promise<void>;
}

export function BulkXpModal({ isOpen, onClose, selectedCount, onSubmit }: BulkXpModalProps) {
  const [direction, setDirection] = useState<"ADD" | "REMOVE">("ADD");
  const [amount, setAmount] = useState<string>("50");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!Number.isInteger(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(direction, numAmount, note);
      onClose();
      // Reset form
      setAmount("50");
      setNote("");
      setDirection("ADD");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = Number.isInteger(Number(amount)) && Number(amount) > 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Manage Bulk XP
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
              You are adjusting XP for <strong>{selectedCount === "ALL" ? "all students" : `${selectedCount} selected student${selectedCount === 1 ? '' : 's'}`}</strong>.
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("ADD")}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      direction === "ADD"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Give XP
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("REMOVE")}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      direction === "REMOVE"
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Take XP
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Amount (XP)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  placeholder="e.g. 50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Reason / Note (Optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                  placeholder="e.g. Completed a special challenge"
                  maxLength={240}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className={direction === "ADD" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
              >
                {isSubmitting ? "Saving..." : direction === "ADD" ? "Give XP" : "Take XP"}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
