"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Check,
  Clock,
  Link2,
  Type,
  Video,
  X,
} from "lucide-react";
import { Field, SelectField, TextAreaField } from "@/components/ui/field";
import { Button, buttonStyles } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import type { CourseSummary, AdminLiveClass } from "./_types";
import { formatDuration } from "./_types";

type ScheduleForm = {
  courseId: string;
  title: string;
  description: string;
  startTime: string;
  duration: string;
  meetingUrl: string;
};

const defaultForm: ScheduleForm = {
  courseId: "",
  title: "",
  description: "",
  startTime: "",
  duration: "60",
  meetingUrl: "",
};

export default function ScheduleClassModal({
  courses,
  coursesLoading,
  onClose,
  onCreated,
}: {
  courses: CourseSummary[];
  coursesLoading: boolean;
  onClose: () => void;
  onCreated: (created: AdminLiveClass) => void;
}) {
  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successMsg, setSuccessMsg] = useState("");

  // Set a default start time to the next full hour
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setForm((p) => ({ ...p, startTime: localISO }));
  }, []);

  const selectedCourse = courses.find((c) => c.id === form.courseId) ?? null;
  const durationNum = parseInt(form.duration, 10) || 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setSuccessMsg("");

    // Client-side guards before hitting the server
    if (!form.courseId) {
      setError("Please select a course.");
      return;
    }
    if (!form.title || form.title.trim().length < 3) {
      setFieldErrors({ title: ["Title must be at least 3 characters."] });
      return;
    }
    if (!form.startTime) {
      setFieldErrors({ startTime: ["Please pick a start date and time."] });
      return;
    }
    const parsedDate = new Date(form.startTime);
    if (isNaN(parsedDate.getTime())) {
      setFieldErrors({ startTime: ["Invalid date — please pick a valid start time."] });
      return;
    }
    if (!durationNum || isNaN(durationNum) || durationNum < 5) {
      setFieldErrors({ duration: ["Duration must be at least 5 minutes."] });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/courses/${form.courseId}/live-classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: form.courseId,
          title: form.title.trim(),
          description: form.description?.trim() || undefined,
          startTime: parsedDate.toISOString(),
          duration: durationNum,
          meetingUrl: form.meetingUrl || undefined,
        }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        // Show field-level Zod errors if available
        if (payload.details?.fieldErrors) {
          setFieldErrors(payload.details.fieldErrors as Record<string, string[]>);
        }
        setError(payload.error ?? "Failed to schedule class");
        return;
      }

      setSuccessMsg("Live class scheduled!");

      // Augment with course info for the table
      const created: AdminLiveClass = {
        ...payload.data,
        course: selectedCourse
          ? { id: selectedCourse.id, title: selectedCourse.title, slug: selectedCourse.slug, teacher: selectedCourse.teacher }
          : { id: form.courseId, title: "Unknown", slug: "", teacher: null },
        _count: { attendances: 0 },
      };

      onCreated(created);
      setTimeout(() => onClose(), 900);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#0f172a]/52 px-4 py-10 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="relative w-full max-w-[700px] overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_40px_80px_rgba(15,23,42,0.18)]"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="relative border-b border-[#e5eef8] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-7 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">Schedule</Badge>
                <Badge className="bg-[#ecfdf5] text-[#15803d]" tone="neutral">
                  New Live Class
                </Badge>
              </div>
              <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                Schedule a Live Class
              </h2>
              <p className="mt-1 text-[13px] text-[#64748b]">
                Choose a course, set the time, and enrolled students + the
                assigned teacher will see it instantly.
              </p>
            </div>
            <button
              onClick={onClose}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[#e7eef6] bg-white text-[#94a3b8] transition-colors hover:border-[#cbd5e1] hover:text-[#0f172a]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="grid gap-6 px-7 py-7">
          {/* Course selector */}
          <SelectField
            label="Course"
            hint="The class will be visible to all students enrolled in this course."
            value={form.courseId}
            onChange={(e) =>
              setForm((p) => ({ ...p, courseId: e.target.value }))
            }
            disabled={coursesLoading || courses.length === 0}
            required
          >
            <option value="">
              {coursesLoading
                ? "Loading courses..."
                : courses.length === 0
                  ? "No courses available"
                  : "Select a course"}
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.teacher?.name ? ` — ${c.teacher.name}` : ""}
              </option>
            ))}
          </SelectField>

          {/* Title & Duration */}
          <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <div>
              <Field
                required
                label="Class title"
                hint="A clear name like 'React Hooks Deep Dive — Session 3'."
                value={form.title}
                onChange={(e) => {
                  setForm((p) => ({ ...p, title: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, title: [] }));
                }}
                placeholder="e.g. React Hooks Deep Dive"
              />
              {fieldErrors.title?.[0] && (
                <p className="mt-1 text-[12px] text-[#dc2626]">{fieldErrors.title[0]}</p>
              )}
            </div>
            <div>
              <Field
                required
                label="Duration (minutes)"
                type="number"
                min={5}
                value={form.duration}
                onChange={(e) => {
                  setForm((p) => ({ ...p, duration: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, duration: [] }));
                }}
                placeholder="60"
              />
              {fieldErrors.duration?.[0] && (
                <p className="mt-1 text-[12px] text-[#dc2626]">{fieldErrors.duration[0]}</p>
              )}
            </div>
          </div>

          {/* Date/Time & Meeting URL */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Field
                required
                label="Start date & time"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => {
                  setForm((p) => ({ ...p, startTime: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, startTime: [] }));
                }}
              />
              {fieldErrors.startTime?.[0] && (
                <p className="mt-1 text-[12px] text-[#dc2626]">{fieldErrors.startTime[0]}</p>
              )}
            </div>
            <Field
              label="Meeting URL (optional)"
              hint="Leave blank to use the built-in video room."
              value={form.meetingUrl}
              onChange={(e) =>
                setForm((p) => ({ ...p, meetingUrl: e.target.value }))
              }
              placeholder="https://meet.jit.si/... (optional)"
            />
          </div>

          {/* Description */}
          <TextAreaField
            label="Description (optional)"
            hint="Brief agenda or topics to cover."
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Today we'll cover..."
            rows={3}
          />

          {/* Preview card */}
          <Surface className="border border-[#dfe9f4] bg-[#fafcff] p-4" tone="panel">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef8ff] text-[#0284c7]">
                  <Video className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Course
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#0f172a]">
                    {selectedCourse?.title ?? "Not selected"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669]">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Duration
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#0f172a]">
                    {durationNum > 0 ? formatDuration(durationNum) : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff5dc] text-[#b45309]">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Scheduled
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#0f172a]">
                    {form.startTime
                      ? new Date(form.startTime).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
            {selectedCourse?.teacher && (
              <p className="mt-3 text-[13px] text-[#64748b]">
                Teacher: <strong>{selectedCourse.teacher.name ?? selectedCourse.teacher.email}</strong> — will see this class in their Class Control dashboard.
              </p>
            )}
          </Surface>

          {/* Footer */}
          <div className="flex flex-col gap-4 rounded-[24px] border border-[#e3edf7] bg-[linear-gradient(180deg,#f6faff_0%,#edf4ff_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[48ch]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0284c7]">
                Publish immediately
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#475569]">
                Once scheduled, enrolled students and the course teacher will see this class right away.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AnimatePresence>
                {error && (
                  <motion.p
                    className="text-[13px] font-medium text-[#dc2626]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
                {successMsg && (
                  <motion.p
                    className="flex items-center gap-1.5 text-[13px] font-medium text-[#15803d]"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {successMsg}
                  </motion.p>
                )}
              </AnimatePresence>
              <Button size="md" type="submit" loading={saving}>
                {saving ? "Scheduling…" : "Schedule Class"}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className={buttonStyles({
                  variant: "secondary",
                  size: "md",
                  className: "bg-white/86",
                })}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
