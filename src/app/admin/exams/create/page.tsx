"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronRight, Save, Loader2 } from "lucide-react";

export default function CreateExamPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState("");
  const [durationMins, setDurationMins] = useState("60");
  const [availableFrom, setAvailableFrom] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCourses(json.data);
          if (json.data.length > 0) setCourseId(json.data[0].id);
        }
      });
  }, []);

  const validate = (): string | null => {
    if (!title.trim()) return "Exam title is required";
    if (!courseId) return "Please select a course";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        title,
        courseId,
        durationMins: parseInt(durationMins, 10) || 60,
        availableFrom: availableFrom ? new Date(availableFrom).toISOString() : null,
      };

      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save");

      // Redirect to the new Content Builder interface
      router.push(`/admin/courses/${courseId}/exams/${json.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:space-y-6 sm:p-6 lg:p-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[13px] font-medium text-[#667085]">
        <button onClick={() => router.push("/admin/exams")} className="hover:text-black">Exams</button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-black">Create Exam</span>
      </div>

      {/* ── Step 1: Details ── */}
      <section className="overflow-hidden rounded-[24px] border border-[#e8eaef] bg-white shadow-sm">
        <div className="border-b border-[#f0f0f5] px-6 py-5">
          <h2 className="text-[18px] font-semibold tracking-tight text-[#101828]">1. Exam Details</h2>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {error && (
            <div className="col-span-full flex items-center gap-2 rounded-[12px] bg-red-50 px-4 py-3 text-[13px] text-red-600 border border-red-100">
              {error}
            </div>
          )}
          <div className="col-span-full sm:col-span-1 lg:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Exam Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UCEED Mock Test 1"
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff] focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Course *</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff]"
            >
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Duration (Minutes)</label>
            <input
              type="number"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              min={1}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">Available From (Optional)</label>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-3 text-[14px] outline-none focus:border-[#38c1ff]"
            />
          </div>
        </div>
      </section>

      {/* ── Step 2: Next ── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-[24px] border border-[#e8eaef] bg-white px-6 py-5 shadow-sm"
      >
        <div>
          <h2 className="text-[16px] font-semibold text-[#101828]">2. Add Content</h2>
          <p className="text-[13px] text-[#9ca3af]">
            Proceed to the Exam Builder to add Sections and Questions.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-[12px] bg-[#2563eb] px-6 py-3 text-[14px] font-bold text-white shadow transition hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          {isSaving ? "Creating Exam…" : "Continue to Builder"}
        </button>
      </motion.section>
    </div>
  );
}
