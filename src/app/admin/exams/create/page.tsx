"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { m as motion } from "motion/react";
import { ChevronRight, FileText, Layers, ListChecks, Loader2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  adminButton,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
} from "../../_components/admin-ui";

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
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] font-medium text-[#64748b]">
        <button type="button" onClick={() => router.push("/admin/exams")} className="transition-colors hover:text-[#0f172a]">Exams</button>
        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-[#0f172a]">Create exam</span>
      </nav>

      <AdminPageHeader
        eyebrow="Exam management"
        icon={FileText}
        title="Create a test"
        description="Set the basics here, then add sections and questions in the exam builder."
      />

      {/* ── Step 1: Details ── */}
      <AdminPanel>
        <AdminPanelHeader icon={ListChecks} tone="sky" title="1. Exam details" description="Title, course and timing" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {error && (
            <div className="col-span-full flex items-center gap-2 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[13px] text-[#b91c1c]">
              {error}
            </div>
          )}
          <label className="col-span-full block sm:col-span-1 lg:col-span-2">
            <span className={adminLabelClass}>Exam title *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. UCEED Mock Test 1"
              className={adminInputClass}
            />
          </label>
          <label className="block">
            <span className={adminLabelClass}>Course *</span>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={adminInputClass}>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={adminLabelClass}>Duration (minutes)</span>
            <input
              type="number"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
              min={1}
              className={adminInputClass}
            />
          </label>
          <label className="block">
            <span className={adminLabelClass}>Available from (optional)</span>
            <input
              type="datetime-local"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
              className={adminInputClass}
            />
          </label>
        </div>
      </AdminPanel>

      {/* ── Step 2: Next ── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${adminPanelClass} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6`}
      >
        <AdminPanelHeader icon={Layers} tone="violet" title="2. Add content" description="Continue to the exam builder to add sections and questions" />
        <button type="button" onClick={handleSave} disabled={isSaving} className={adminButton.primary}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          {isSaving ? "Creating exam…" : "Continue to builder"}
        </button>
      </motion.section>
    </div>
  );
}
