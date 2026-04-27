"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Mentor } from "./_types";

interface Skill {
  id: string;
  label: string;
  value: number;
  color: string;
}

export function MentorSkillsModal({
  mentor,
  onClose,
}: {
  mentor: Mentor;
  onClose: () => void;
}) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const fetchSkills = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mentors/${mentor.id}/skills`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSkills(data.data);
        const vals: Record<string, number> = {};
        (data.data as Skill[]).forEach((s) => { vals[s.id] = s.value; });
        setLocalValues(vals);
      } else {
        setError(data.error ?? "Failed to load skills.");
      }
    } catch (err) {
      console.error("[SKILLS_MODAL_FETCH]", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentor.id]);

  const handleChange = (skillId: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setLocalValues((prev) => ({ ...prev, [skillId]: clamped }));
    setDirty(true);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const skillsToUpdate = skills.map((s) => ({
        id: s.id,
        value: localValues[s.id] ?? s.value,
      }));
      const res = await fetch(`/api/admin/mentors/${mentor.id}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: skillsToUpdate }),
      });
      const data = await res.json();
      if (data.success) {
        setDirty(false);
        setSavedAt(new Date());
        await fetchSkills();
      } else {
        alert(data.error ?? "Failed to save skills.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-5">
            <div>
              <h2 className="text-[20px] font-bold text-gray-900">Mentorship Skills</h2>
              <p className="mt-0.5 text-[13px] text-gray-500">
                Adjusting ratings for{" "}
                <span className="font-semibold text-[#7c3aed]">{mentor.name ?? mentor.email}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-gray-500 shadow-sm hover:bg-white hover:text-gray-900 transition-all"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {loading ? (
              /* Skeleton */
              <div className="space-y-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-2 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-3.5 w-36 rounded-full bg-gray-200" />
                      <div className="h-3.5 w-10 rounded-full bg-gray-200" />
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error state */
              <div className="flex flex-col items-center py-10 text-center">
                <div className="mb-3 text-4xl">⚠️</div>
                <p className="font-semibold text-gray-800">Could not load skills</p>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={fetchSkills}
                  className="mt-4 rounded-xl bg-[#7c3aed] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : skills.length === 0 ? (
              /* Empty state — should not happen after seeding */
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-gray-500">No skills found. Please refresh.</p>
                <button onClick={fetchSkills} className="mt-3 text-sm text-[#7c3aed] underline">Refresh</button>
              </div>
            ) : (
              /* Skills list */
              <div className="max-h-[420px] space-y-5 overflow-y-auto pr-1">
                {skills.map((skill) => {
                  const current = localValues[skill.id] ?? skill.value;
                  return (
                    <div key={skill.id}>
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: skill.color }}
                          />
                          <span className="text-[14px] font-semibold text-gray-800">{skill.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={current}
                            onChange={(e) => handleChange(skill.id, Number(e.target.value))}
                            className="w-14 rounded-lg border border-gray-200 py-1 text-center text-sm font-bold text-gray-900 focus:border-[#7c3aed] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                          />
                          <span className="text-[12px] text-gray-400">%</span>
                        </div>
                      </div>

                      {/* Visual bar + slider stacked */}
                      <div className="relative">
                        {/* Background track */}
                        <div className="pointer-events-none h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: skill.color }}
                            animate={{ width: `${current}%` }}
                            transition={{ type: "spring", stiffness: 400, damping: 35 }}
                          />
                        </div>
                        {/* Invisible native range on top (for interaction) */}
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={current}
                          onChange={(e) => handleChange(skill.id, Number(e.target.value))}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        />
                      </div>

                      {/* Mini scale labels */}
                      <div className="mt-1 flex justify-between text-[10px] text-gray-300">
                        <span>0</span>
                        <span>50</span>
                        <span>100</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && skills.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <p className="text-[12px] text-gray-400">
                {savedAt
                  ? `✓ Saved at ${savedAt.toLocaleTimeString()}`
                  : dirty
                  ? "Unsaved changes"
                  : "Changes reflect immediately on the mentor's profile."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {dirty ? "Discard" : "Close"}
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={!dirty || saving}
                  className="flex items-center gap-2 rounded-xl bg-[#7c3aed] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] disabled:opacity-40 transition-all"
                >
                  {saving && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
