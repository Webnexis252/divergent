"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Mentor } from "./_types";

interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  isCompleted: boolean;
  month: number;
  year: number;
}

export function MentorGoalsModal({
  mentor,
  onClose,
}: {
  mentor: Mentor;
  onClose: () => void;
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New goal form state
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(10);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchGoals = () => {
    setLoading(true);
    fetch(`/api/admin/mentors/${mentor.id}/goals`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setGoals(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGoals();
  }, [mentor.id]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !target) return;

    try {
      const res = await fetch(`/api/admin/mentors/${mentor.id}/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, target, month, year }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAdding(false);
        setTitle("");
        setTarget(10);
        fetchGoals();
      } else {
        alert("Failed to add goal.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding goal.");
    }
  };

  const handleUpdateProgress = async (goalId: string, newCurrent: number, isCompleted: boolean) => {
    try {
      const res = await fetch(`/api/admin/mentors/${mentor.id}/goals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, current: newCurrent, isCompleted }),
      });
      const data = await res.json();
      if (data.success) {
        fetchGoals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      const res = await fetch(`/api/admin/mentors/${mentor.id}/goals?goalId=${goalId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchGoals();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl overflow-hidden rounded-[24px] bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage Goals</h2>
              <p className="text-sm text-gray-500">For {mentor.name || mentor.email}</p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Current Goals</h3>
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="rounded-full bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors"
              >
                {isAdding ? "Cancel" : "+ Add Goal"}
              </button>
            </div>

            {isAdding && (
              <form onSubmit={handleAddGoal} className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Goal Title</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Complete Grading Submissions"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Target Value</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={target}
                      onChange={(e) => setTarget(parseInt(e.target.value) || 1)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Month</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value) || 1)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Year</label>
                      <input
                        type="number"
                        min={2020}
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 w-full rounded-lg bg-[#7c3aed] py-2 font-semibold text-white hover:bg-[#6d28d9] transition-colors"
                >
                  Save Goal
                </button>
              </form>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
              </div>
            ) : goals.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-6">No goals found for this mentor.</p>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between bg-white">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                          {goal.month}/{goal.year}
                        </span>
                        {goal.isCompleted && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                            DONE
                          </span>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500">{goal.current} / {goal.target}</span>
                        <div className="h-2 flex-1 rounded-full bg-gray-100">
                          <div 
                            className={`h-full rounded-full ${goal.isCompleted ? 'bg-green-500' : 'bg-[#7c3aed]'}`}
                            style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 border-t border-gray-100 pt-3 sm:border-0 sm:pt-0">
                      <button
                        onClick={() => handleUpdateProgress(goal.id, goal.current + 1, goal.current + 1 >= goal.target)}
                        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                        disabled={goal.isCompleted}
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleUpdateProgress(goal.id, goal.current, !goal.isCompleted)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${goal.isCompleted ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                      >
                        {goal.isCompleted ? 'Mark Active' : 'Mark Done'}
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
