"use client";

import { useEffect, useState, useCallback, lazy, Suspense, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  GraduationCap,
  ImagePlus,
  IndianRupee,
  LayoutPanelTop,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import { Field, TextAreaField } from "@/components/ui/field";
import { Button, buttonStyles } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/lib/cx";

import type { Course, Teacher } from "./_types";
import { teacherRoleLabel, getTeacherDisplayName } from "./_types";
import { uploadCourseThumbnail } from "./upload-thumbnail";

// Lazy-load the edit modal so it doesn't block initial page compilation
const EditCourseModal = lazy(() => import("./EditCourseModal"));

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    description: "",
    overviewContent: "",
    thumbnail: "",
    price: "",
    teacherIds: [] as string[],
    totalHours: "",
    lessonCount: "",
    courseRating: "",
    autoCalculateRating: true,
    enrolledStudents: "",
    autoUpdateEnrolled: true,
    learningOutcomes: [] as string[],
    category: "",
    courseLevel: "",
    language: "",
    visibility: "Public",
    pricingType: "Paid",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teachersError, setTeachersError] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      try {
        const res = await fetch("/api/courses");
        const payload = await res.json();
        if (!cancelled && payload.success) {
          setCourses(payload.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTeachers() {
      try {
        const res = await fetch("/api/admin/mentors");
        const payload = await res.json();

        if (cancelled) return;

        if (!res.ok || !payload.success) {
          setTeachersError(payload.error ?? "Failed to load teachers");
          return;
        }

        // Handle new { active, pending } structure or fallback to array
        const teacherList = Array.isArray(payload.data)
          ? payload.data
          : payload.data?.active || [];
          
        setTeachers(teacherList);
      } catch {
        if (!cancelled) setTeachersError("Failed to load teachers");
      } finally {
        if (!cancelled) setTeachersLoading(false);
      }
    }

    loadTeachers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle,
          description: form.description,
          overviewContent: form.overviewContent,
          thumbnail: form.thumbnail || undefined,
          price: 0,
          teacherIds: form.teacherIds,
          totalHours: form.totalHours ? Number(form.totalHours) : undefined,
          lessonCount: form.lessonCount ? Number(form.lessonCount) : undefined,
          courseRating: form.courseRating ? Number(form.courseRating) : undefined,
          autoCalculateRating: form.autoCalculateRating,
          enrolledStudents: form.enrolledStudents ? Number(form.enrolledStudents) : undefined,
          autoUpdateEnrolled: form.autoUpdateEnrolled,
          learningOutcomes: form.learningOutcomes,
          category: form.category,
          courseLevel: form.courseLevel,
          language: form.language,
          visibility: form.visibility,
          pricingType: form.pricingType,
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create course"); return; }
      setCourses((prev) => [p.data, ...prev]);
      setForm({ title: "", subtitle: "", description: "", overviewContent: "", thumbnail: "", price: "", teacherIds: [], totalHours: "", lessonCount: "", courseRating: "", autoCalculateRating: true, enrolledStudents: "", autoUpdateEnrolled: true, learningOutcomes: [], category: "", courseLevel: "", language: "", visibility: "Public", pricingType: "Paid" });
      setThumbnailUploadError("");
      setShowCreate(false);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

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

  const handleCourseSaved = useCallback((updated: Course) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    );
  }, []);

  const published = courses.filter((c) => c.isPublished).length;
  const totalEnrollments = courses.reduce((a, c) => a + (c._count?.enrollments ?? 0), 0);
  const slugPreview = form.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const priceValue = Number.parseFloat(form.price);
  const priceLabel =
    Number.isFinite(priceValue) && priceValue > 0
      ? `₹${priceValue.toLocaleString("en-IN")}`
      : "Free access";
  const selectedTeacher = teachers.find((teacher) => form.teacherIds.includes(teacher.id)) ?? null;
  const selectedTeacherLabel = getTeacherDisplayName(selectedTeacher);
  const selectedTeacherMeta = selectedTeacher
    ? [teacherRoleLabel[selectedTeacher.role], selectedTeacher.email].filter(Boolean).join(" • ")
    : teachersLoading
      ? "Loading eligible teachers..."
      : teachersError
        ? teachersError
        : "Pick the primary teacher responsible for this course.";

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#0369a1] via-[#0284c7] to-[#38c1ff] px-8 py-10 text-white shadow-[0_24px_60px_rgba(2,132,199,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Course Library
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Courses</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                  Manage published courses. Create new ones and track enrollment growth.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className={cx(
                  buttonStyles({
                    variant: "secondary",
                    size: "md",
                    className:
                      "shrink-0 rounded-[18px] border-white/70 bg-white/94 text-[#0284c7] hover:bg-white",
                  }),
                )}
              >
                {showCreate ? "Close Creator" : "+ New Course"}
              </button>
            </div>
          </section>
        </RevealSection>

        {/* Create form */}
        {showCreate && (
          <RevealSection>
            <section className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_380px]">
              <Surface
                className="overflow-hidden border border-[#dff1ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-0 shadow-[0_20px_60px_rgba(2,132,199,0.08)]"
                tone="elevated"
              >
                <div className="border-b border-[#e3edf7] px-6 py-6 sm:px-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">Creation Section</Badge>
                        <Badge className="bg-[#fff4d6] text-[#b45309]" tone="neutral">
                          Figma-inspired
                        </Badge>
                      </div>
                      <div>
                        <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[#0f172a]">
                          Create a course with clearer structure and a live preview.
                        </h2>
                        <p className="mt-3 max-w-[56ch] text-[15px] leading-7 text-[#5b6b7f]">
                          This section now mirrors the denser admin-form pattern from the Figma
                          mock: grouped inputs, ownership controls, quick status cues, and a
                          preview area that keeps the course identity visible while you build it.
                        </p>
                      </div>
                    </div>

                    <div className="grid min-w-[240px] gap-3 rounded-[22px] border border-[#e5eef8] bg-white/88 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e8f8ff] text-[#0284c7]">
                          <LayoutPanelTop className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#7b8ca0]">
                            Visibility
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                            Draft on create
                          </p>
                        </div>
                      </div>
                      <p className="text-[13px] leading-6 text-[#64748b]">
                        New courses still enter the system as drafts, so this section stays safe
                        for iteration before publishing.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="grid gap-6 px-6 py-6 sm:px-8 sm:py-8">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                    <Field
                      required
                      hint="Use the final learner-facing title. The slug preview updates automatically."
                      label="Course title"
                      onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Advanced React Patterns"
                      value={form.title}
                    />
                    <Field
                      label="Price (INR)"
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="0"
                      type="number"
                      min={0}
                      value={"0"}
                      disabled={true}
                      hint="Locked to Free (0) during testing period"
                    />
                  </div>


                  <div className="grid gap-4 lg:grid-cols-2">
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
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)]">
                    <div className="flex flex-col gap-4">
                      <TextAreaField
                        hint="Keep it concise. This is the summary learners see before they commit."
                        label="Short description"
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Summarize the promise, pace, and outcome of the course."
                        rows={3}
                        value={form.description}
                      />
                      <TextAreaField
                        hint="Detailed description for the course overview."
                        label="Overview Content"
                        onChange={(e) => setForm((prev) => ({ ...prev, overviewContent: e.target.value }))}
                        placeholder="Detailed paragraphs..."
                        rows={6}
                        value={form.overviewContent}
                      />
                    </div>


                    <div className="space-y-3">
                      <label className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        Course Thumbnail
                      </label>

                      <div className="rounded-[22px] border border-[#e2ebf5] bg-white/90 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)]">
                        <div className="flex items-start gap-3">
                          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#eef8ff] text-[#0284c7]">
                            <ImagePlus className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[15px] font-semibold text-[#0f172a]">
                              Upload from local device
                            </p>
                            <p className="mt-1 text-[13px] leading-6 text-[#64748b]">
                              JPEG, PNG, WEBP, or GIF up to 10 MB. The uploaded image will be used
                              for the course preview card.
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
                        hint="You can still paste a hosted image URL manually if needed."
                        label="Thumbnail URL"
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, thumbnail: e.target.value }))
                        }
                        placeholder="https://..."
                        value={form.thumbnail}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
                    <div className="flex flex-col gap-2">
                      <label className="text-[14px] font-semibold text-[#1e293b]">Primary Teacher(s)</label>
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

                    <Surface className="border border-[#dfe9f4] bg-white/90 p-4" tone="panel">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                            Teaching owner
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                            {selectedTeacher ? selectedTeacherLabel : "Not assigned yet"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-3 text-[13px] leading-6 text-[#64748b]">
                        {selectedTeacherMeta}
                      </p>
                    </Surface>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
                    <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eef8ff] text-[#0284c7]">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                            Slug preview
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                            {slugPreview || "course-slug-preview"}
                          </p>
                        </div>
                      </div>
                    </Surface>
                    <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#fff5dc] text-[#b45309]">
                          <IndianRupee className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                            Access model
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                            {priceLabel}
                          </p>
                        </div>
                      </div>
                    </Surface>
                    <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#eef6ff] text-[#2563eb]">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                            Assigned teacher
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                            {selectedTeacher ? selectedTeacherLabel : "Choose a teacher"}
                          </p>
                        </div>
                      </div>
                    </Surface>
                    <Surface className="border border-[#e7eef6] bg-white/90 p-4" tone="panel">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#ecfdf5] text-[#059669]">
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                            Ready state
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-[#0f172a]">
                            {form.title.trim() ? "Configured for save" : "Waiting for details"}
                          </p>
                        </div>
                      </div>
                    </Surface>
                  </div>

                  <div className="rounded-[24px] border border-[#d7f2e8] bg-[linear-gradient(180deg,#f2fcf7_0%,#e8f8ef_100%)] px-5 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="max-w-[50ch]">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#15803d]">
                          Publishing flow
                        </p>
                        <p className="mt-2 text-[15px] leading-7 text-[#275540]">
                          Save the shell first, then add chapters, lessons, and access rules from
                          the course library. This keeps course creation lightweight while still
                          matching the more editorial Figma layout.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {error ? (
                          <p className="mr-2 text-[13px] font-medium text-[#dc2626]">{error}</p>
                        ) : null}
                        <Button size="md" type="submit" loading={saving}>
                          {saving ? "Creating…" : "Create Course"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setShowCreate(false)}
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
                  </div>
                </form>
              </Surface>

              <div className="grid gap-6">
                <Surface
                  className="overflow-hidden border border-[#dbeeff] bg-[linear-gradient(180deg,#ffffff_0%,#f5fbff_100%)] p-5"
                  tone="panel"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                        Live preview
                      </p>
                      <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                        {form.title.trim() || "Untitled course"}
                      </h3>
                    </div>
                    <div className="rounded-full bg-[#fff3cd] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b45309]">
                      Draft
                    </div>
                  </div>

                  <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e4edf7] bg-white">
                    <div
                      className="relative flex min-h-[210px] items-end overflow-hidden px-5 py-5"
                      style={{
                        background:
                          form.thumbnail.trim()
                            ? `linear-gradient(180deg, rgba(6,47,79,0.08), rgba(6,47,79,0.42)), url(${form.thumbnail}) center / cover`
                            : "linear-gradient(145deg, rgba(56,193,255,0.12), rgba(254,198,0,0.18))",
                      }}
                    >
                      {!form.thumbnail.trim() ? (
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="grid h-16 w-16 place-items-center rounded-[22px] bg-white/90 text-[#0284c7] shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                            <ImagePlus className="h-7 w-7" />
                          </div>
                        </div>
                      ) : null}

                      <div className="relative z-10 w-full rounded-[20px] bg-[#0f172a]/78 px-4 py-4 text-white backdrop-blur-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                          Course snapshot
                        </p>
                        <p className="mt-2 text-[17px] font-semibold tracking-[-0.04em]">
                          {form.title.trim() || "Your course title will appear here"}
                        </p>
                        <p className="mt-3 text-[13px] leading-6 text-white/78">
                          {form.description.trim() ||
                            "Add a focused summary to show the promise of the program before students open the full curriculum."}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 px-5 py-5">
                      <div className="flex items-center justify-between rounded-[18px] bg-[#f8fbfe] px-4 py-3">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                          Price
                        </span>
                        <span className="text-[14px] font-semibold text-[#0f172a]">{priceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-[18px] bg-[#f8fbfe] px-4 py-3">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                          URL slug
                        </span>
                        <span className="text-[14px] font-semibold text-[#0f172a]">
                          {slugPreview || "course-slug-preview"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-[18px] bg-[#f8fbfe] px-4 py-3">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
                          Teacher
                        </span>
                        <span className="max-w-[60%] truncate text-right text-[14px] font-semibold text-[#0f172a]">
                          {selectedTeacher ? selectedTeacherLabel : "Not assigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Surface>

                <Surface className="border border-[#ebedf2] bg-white p-5" tone="panel">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
                    Section notes
                  </p>
                  <div className="mt-4 space-y-3">
                    {[
                      "The title and description carry the visual weight, so they stay prominent and left-aligned.",
                      "Teacher assignment now happens during creation, so ownership is captured before chapters and live classes are added.",
                      "The right panel keeps the layout close to the Figma admin-form pattern while reflecting the real create API payload.",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-[18px] border border-[#edf1f6] bg-[#fafcff] px-4 py-3"
                      >
                        <div className="mt-1 grid h-6 w-6 place-items-center rounded-full bg-[#e8f8ff] text-[#0284c7]">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-[13px] leading-6 text-[#5b6b7f]">{item}</p>
                      </div>
                    ))}
                  </div>
                </Surface>
              </div>
            </section>
          </RevealSection>
        )}

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <AdminStatCard index={0} title="Total Courses" value={loading ? "…" : courses.length} caption="All courses in the system." tone="sky" />
          <AdminStatCard index={1} title="Published" value={loading ? "…" : published} caption="Currently visible to students." tone="emerald" />
          <AdminStatCard index={2} title="Total Enrollments" value={loading ? "…" : totalEnrollments} caption="Combined learners across all courses." tone="amber" />
        </StaggerGrid>

        {/* Course table */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">Course Library</h2>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)}
                </div>
              ) : (
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="border-b border-[#eef0f3] text-[12px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
                      <th className="px-6 py-4">Course</th>
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Chapters</th>
                      <th className="px-6 py-4">Enrolled</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Created</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, i) => (
                      <motion.tr
                        key={course.id}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-[#f1f5f9] last:border-none hover:bg-[#f8fafc]"
                      >
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#101828]">{course.title}</p>
                          {course.description && <p className="mt-0.5 line-clamp-1 text-[12px] text-[#94a3b8]">{course.description}</p>}
                        </td>
                        <td className="px-6 py-4">
                          {course.teachers && course.teachers.length > 0 ? (
                            <div className="space-y-2">
                              {course.teachers.map((t) => (
                                <div key={t.id}>
                                  <p className="font-semibold text-[#101828]">
                                    {getTeacherDisplayName(t)}
                                  </p>
                                  <p className="mt-0.5 text-[12px] text-[#94a3b8]">
                                    {teacherRoleLabel[t.role]}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[13px] text-[#94a3b8]">Not assigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#101828]">
                          {course.price === 0 ? "Free" : `₹${course.price.toLocaleString("en-IN")}`}
                        </td>
                        <td className="px-6 py-4 text-[#64748b]">{course._count?.chapters ?? 0}</td>
                        <td className="px-6 py-4 font-semibold text-[#101828]">{course._count?.enrollments ?? 0}</td>
                        <td className="px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${course.isPublished ? "bg-[#ecfdf5] text-[#15803d]" : "bg-[#f1f5f9] text-[#64748b]"}`}>
                            {course.isPublished ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#94a3b8]">{formatShortDate(course.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setEditingCourse(course)}
                            className="inline-flex items-center gap-1.5 rounded-[14px] border border-[#e2e8f0] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#475569] shadow-[0_2px_6px_rgba(15,23,42,0.04)] transition-all hover:border-[#0284c7] hover:bg-[#f0f9ff] hover:text-[#0284c7] hover:shadow-[0_4px_12px_rgba(2,132,199,0.12)]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </RevealSection>
      </div>

      {/* Edit Course Modal — lazy loaded */}
      {editingCourse && (
        <Suspense fallback={null}>
          <EditCourseModal
            key={editingCourse.id}
            course={editingCourse}
            teachers={teachers}
            teachersLoading={teachersLoading}
            onClose={() => setEditingCourse(null)}
            onSaved={handleCourseSaved}
          />
        </Suspense>
      )}
    </PageTransition>
  );
}
