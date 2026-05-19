"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Target } from "lucide-react";

interface AssignGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}

export function AssignGoalModal({ isOpen, onClose, studentId, studentName }: AssignGoalModalProps) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/teacher/students/${studentId}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, target: parseInt(target) || 1 }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to assign goal");
      } else {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setTitle("");
          setTarget("1");
          setSuccess(false);
        }, 1500);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="border-b border-[#eef2f7] px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0f172a] flex items-center gap-2">
                <Target className="h-5 w-5 text-[#38c1ff]" />
                Assign Weekly Goal
              </h2>
              <button
                className="rounded-full p-2 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                onClick={onClose}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-1 text-sm text-[#64748b]">
              For student: <span className="font-semibold text-[#0f172a]">{studentName}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#475569]">
                  Goal Description
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete 5 Practice Tests"
                  className="w-full rounded-xl border border-[#cbd5e1] px-4 py-3 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-2 focus:ring-[#38c1ff]/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#475569]">
                  Target Quantity (Optional)
                </label>
                <input
                  type="number"
                  min="1"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full rounded-xl border border-[#cbd5e1] px-4 py-3 text-sm focus:border-[#38c1ff] focus:outline-none focus:ring-2 focus:ring-[#38c1ff]/20"
                />
                <p className="mt-1 text-xs text-[#94a3b8]">
                  Used to track progress (e.g. 5 tests). Defaults to 1 for simple tasks.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">
                  Goal assigned successfully!
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[#64748b] transition hover:bg-[#f1f5f9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title}
                className="rounded-xl bg-[#38c1ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0ea5e9] disabled:opacity-50"
              >
                {loading ? "Assigning..." : "Assign Goal"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
