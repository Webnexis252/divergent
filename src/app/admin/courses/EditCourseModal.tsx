"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  ImagePlus,
  IndianRupee,
  ShieldCheck,
  ClipboardList,
  X,
} from "lucide-react";
import { formatShortDate } from "@/lib/date-format";
import { Field, TextAreaField } from "@/components/ui/field";
import { Button, buttonStyles } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/lib/cx";
import type { Course, Teacher } from "./_types";
import { teacherRoleLabel, getTeacherDisplayName } from "./_types";
import { uploadCourseThumbnail } from "./upload-thumbnail";

type EditForm = {
  title: string;
  subtitle: string;
  description: string;
  overviewContent: string;
  thumbnail: string;
  price: string;
  teacherIds: string[];
  isPublished: boolean;
  totalHours: string;
  lessonCount: string;
  courseRating: string;
  category: string;
  courseLevel: string;
  language: string;
};

export default function EditCourseModal({
  course,
  teachers,
  teachersLoading,
  onClose,
  onSaved,
}: {
  course: Course;
  teachers: Teacher[];
  teachersLoading: boolean;
  onClose: () => void;
  onSaved: (updated: Course) => void;
}) {
  const [form, setForm] = useState<EditForm>({
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    overviewContent: course.overviewContent ?? "",
    thumbnail: course.thumbnail ?? "",
    price: String(course.price),
    teacherIds: course.teachers?.map((t) => t.id) ?? [],
    isPublished: course.isPublished,
    totalHours: course.totalHours !== null ? String(course.totalHours) : "",
    lessonCount: course.lessonCount !== null ? String(course.lessonCount) : "",
    courseRating: course.courseRating !== null ? String(course.courseRating) : "",
    category: course.category ?? "",
    courseLevel: course.courseLevel ?? "",
    language: course.language ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  async function handleThumbnailFileChange(file: File) {
    setThumbnailUploading(true);
    setThumbnailUploadError("");

    try {
      const uploadedUrl = await uploadCourseThumbnail(file);
      setForm((prev) => ({ ...prev, thumbnail: uploadedUrl }));
    } catch (uploadError) {
      setThumbnailUploadError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload thumbnail",
      );
    } finally {
      setThumbnailUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle || undefined,
          description: form.description || undefined,
          overviewContent: form.overviewContent || undefined,
          thumbnail: form.thumbnail || undefined,
          price: 0,
          teacherIds: form.teacherIds,
          isPublished: form.isPublished,
          totalHours: form.totalHours ? Number(form.totalHours) : undefined,
          lessonCount: form.lessonCount ? Number(form.lessonCount) : undefined,
          courseRating: form.courseRating ? Number(form.courseRating) : undefined,
          category: form.category || undefined,
          courseLevel: form.courseLevel || undefined,
          language: form.language || undefined,
        }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        setError(payload.error ?? "Failed to update course");
        return;
      }

      setSuccessMsg("Course updated successfully!");
      onSaved(payload.data);

      setTimeout(() => onClose(), 900);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const selectedTeacher = teachers.find((t) => form.teacherIds.includes(t.id)) ?? null;
  const selectedTeacherLabel = getTeacherDisplayName(selectedTeacher);
  const priceValue = Number.parseFloat(form.price);
  const priceLabel =
    Number.isFinite(priceValue) && priceValue > 0
      ? `₹${priceValue.toLocaleString("en-IN")}`
      : "Free access";

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
        className="relative w-full max-w-[780px] overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_40px_80px_rgba(15,23,42,0.18)]"
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
                <Badge tone="brand">Edit Course</Badge>
                <Badge
                  className={
                    form.isPublished
                      ? "bg-[#ecfdf5] text-[#15803d]"
                      : "bg-[#fff3cd] text-[#b45309]"
                  }
                  tone="neutral"
                >
                  {form.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
              <h2 className="mt-3 text-[24px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                {course.title}
              </h2>
              <p className="mt-1 text-[13px] text-[#64748b]">
                Created {formatShortDate(course.createdAt)} · {course._count.chapters} chapter
                {course._count.chapters !== 1 ? "s" : ""} · {course._count.enrollments} enrolled
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
        <form onSubmit={handleSave} className="grid gap-6 px-7 py-7">
          {/* Title & Price */}
          <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <Field
              required
              label="Course title"
              hint="Update the learner-facing title."
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Advanced React Patterns"
            />
            <Field
              label="Price (INR)"
              value={"0"}
              onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
              placeholder="0"
              type="number"
              min={0}
              disabled={true}
              hint="Locked to Free (0) during testing period"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subtitle/Tagline" onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} value={form.subtitle} placeholder="e.g. Master the fundamentals" />
            <Field label="Total Hours" onChange={e => setForm(p => ({...p, totalHours: e.target.value}))} value={form.totalHours} placeholder="e.g. 12" type="number" />
            <Field label="Number of Lessons" onChange={e => setForm(p => ({...p, lessonCount: e.target.value}))} value={form.lessonCount} placeholder="e.g. 24" type="number" />
            <Field label="Course Rating" onChange={e => setForm(p => ({...p, courseRating: e.target.value}))} value={form.courseRating} placeholder="e.g. 4.8" type="number" step="0.1" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category} placeholder="e.g. Design" />
            <Field label="Course Level" onChange={e => setForm(p => ({...p, courseLevel: e.target.value}))} value={form.courseLevel} placeholder="e.g. Beginner" />
            <Field label="Language" onChange={e => setForm(p => ({...p, language: e.target.value}))} value={form.language} placeholder="e.g. English" />
          </div>

          {/* Description & Thumbnail */}
          <div className="grid gap-4 sm:grid-cols-[1fr_0.7fr]">
            <div className="flex flex-col gap-4">
              <TextAreaField
                label="Short description"
                hint="Concise summary for the course card."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Summarize the promise, pace, and outcome."
                rows={3}
              />
              <TextAreaField
                label="Overview Content"
                hint="Detailed description."
                value={form.overviewContent}
                onChange={(e) => setForm((p) => ({ ...p, overviewContent: e.target.value }))}
                placeholder="Detailed paragraphs..."
                rows={5}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[13px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                Course Thumbnail
              </label>

              <div className="rounded-[20px] border border-[#e2ebf5] bg-white/92 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef8ff] text-[#0284c7]">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#0f172a]">
                      Upload from local device
                    </p>
                    <p className="mt-1 text-[13px] leading-6 text-[#64748b]">
                      Replace the current thumbnail with an image from your computer, or keep using
                      a hosted URL below.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={thumbnailUploading}
                    onClick={() => thumbnailInputRef.current?.click()}
                  >
                    {thumbnailUploading ? "Uploading…" : "Choose Image"}
                  </Button>

                  {form.thumbnail ? (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, thumbnail: "" }))}
                      className={buttonStyles({
                        variant: "secondary",
                        size: "sm",
                        className: "bg-white",
                      })}
                    >
                      Remove Image
                    </button>
                  ) : null}
                </div>

                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (file) void handleThumbnailFileChange(file);
                  }}
                />

                {thumbnailUploadError ? (
                  <p className="mt-3 text-[13px] font-medium text-[#dc2626]">
                    {thumbnailUploadError}
                  </p>
                ) : null}

                {form.thumbnail ? (
                  <div className="mt-4 overflow-hidden rounded-[18px] border border-[#dbe8f4] bg-[#f8fbff]">
                    <div
                      className="aspect-[16/9] w-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${form.thumbnail})` }}
                    />
                  </div>
                ) : null}
              </div>

              <Field
                label="Thumbnail URL"
                hint="Hosted image URL for the course card."
                value={form.thumbnail}
                onChange={(e) =>
                  setForm((p) => ({ ...p, thumbnail: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Teacher & Publish toggle */}
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#1e293b]">Assigned Teachers</label>
              <div className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 custom-scrollbar">
                {teachersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-[13px] font-medium text-[#64748b]">Loading teachers...</span>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <span className="text-[13px] font-medium text-[#64748b]">No teachers available</span>
                  </div>
                ) : (
                  teachers.map((teacher) => {
                    const isSelected = form.teacherIds.includes(teacher.id);
                    return (
                      <button
                        key={teacher.id}
                        type="button"
                        onClick={() => {
                          setForm((p) => ({
                            ...p,
                            teacherIds: isSelected 
                              ? p.teacherIds.filter((id) => id !== teacher.id)
                              : [...p.teacherIds, teacher.id]
                          }));
                        }}
                        className={cx(
                          "flex w-full items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-all duration-200",
                          isSelected 
                            ? "border-[#ff6b3d] bg-[#fff5f2]" 
                            : "border-transparent bg-white shadow-sm hover:border-[#cbd5e1] hover:bg-[#f1f5f9]"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className={cx("text-[14px] font-semibold", isSelected ? "text-[#ff6b3d]" : "text-[#1e293b]")}>
                            {getTeacherDisplayName(teacher)}
                          </span>
                          {teacher.email && (
                            <span className={cx("text-[12px] font-medium", isSelected ? "text-[#ff6b3d]/70" : "text-[#64748b]")}>
                              {teacher.email}
                            </span>
                          )}
                        </div>
                        <div className={cx(
                          "flex h-5 w-5 items-center justify-center rounded-full border transition-colors",
                          isSelected ? "border-[#ff6b3d] bg-[#ff6b3d]" : "border-[#cbd5e1] bg-white"
                        )}>
                          {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, isPublished: !p.isPublished }))
                }
                className={cx(
                  "flex h-12 items-center gap-2.5 rounded-(--radius-md) border px-5 text-[15px] font-semibold transition-all",
                  form.isPublished
                    ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d] hover:bg-[#dcfce7]"
                    : "border-[#fde68a] bg-[#fffbeb] text-[#b45309] hover:bg-[#fef3c7]",
                )}
              >
                {form.isPublished ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                {form.isPublished ? "Published" : "Draft"}
              </button>
            </div>
          </div>

          {/* Teacher preview card */}
          <Surface className="border border-[#dfe9f4] bg-[#fafcff] p-4" tone="panel">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                  Teaching Owner
                </p>
                <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                  {selectedTeacher ? selectedTeacherLabel : "Not assigned"}
                </p>
              </div>
              {selectedTeacher && (
                <Badge
                  className="ml-auto"
                  tone={
                    selectedTeacher.role === "SUPER_ADMIN"
                      ? "warning"
                      : selectedTeacher.role === "ADMIN"
                        ? "brand"
                        : "success"
                  }
                >
                  {teacherRoleLabel[selectedTeacher.role]}
                </Badge>
              )}
            </div>
            {selectedTeacher?.email && (
              <p className="mt-2 text-[13px] text-[#64748b]">
                {selectedTeacher.email}
              </p>
            )}
          </Surface>

          {/* Quick stat cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef8ff] text-[#0284c7]">
                  <IndianRupee className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Price
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#0f172a]">
                    {priceLabel}
                  </p>
                </div>
              </div>
            </Surface>
            <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef6ff] text-[#2563eb]">
                  <BookOpen className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Chapters
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#0f172a]">
                    {course._count.chapters}
                  </p>
                </div>
              </div>
            </Surface>
            <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669]">
                  <GraduationCap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                    Enrolled
                  </p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#0f172a]">
                    {course._count.enrollments}
                  </p>
                </div>
              </div>
            </Surface>
          </div>

          <div className="flex justify-end">
             <a
                href={`/admin/courses/${course.id}/exams`}
                className="inline-flex items-center gap-2 rounded-(--radius-md) border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-semibold text-[#0f172a] shadow-sm transition-colors hover:bg-[#f1f5f9]"
             >
                <ClipboardList className="h-4 w-4" />
                Manage Exams
             </a>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-4 rounded-[24px] border border-[#e3edf7] bg-[linear-gradient(180deg,#f6faff_0%,#edf4ff_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-[48ch]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0284c7]">
                Save changes
              </p>
              <p className="mt-2 text-[14px] leading-6 text-[#475569]">
                Updates take effect immediately. Teacher reassignment does not affect
                existing student access.
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
                {saving ? "Saving…" : "Save Changes"}
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
