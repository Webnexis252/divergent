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
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import { Field, TextAreaField } from "@/components/ui/field";
import { Button, buttonStyles } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/lib/cx";
import Link from "next/link";

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
    originalPrice: "",
    emiPlans: [] as Array<{ label: string; amount: string; dueDays: string }>,
    testimonials: [] as Array<{ text: string; name: string; rating: string }>,
    faqs: [] as Array<{ question: string; answer: string }>,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teachersError, setTeachersError] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  // Instalment builder state
  const [showAddInstalment, setShowAddInstalment] = useState(false);
  const [newInstalment, setNewInstalment] = useState({ label: "", amount: "", dueDays: "" });
  const [editingInstalmentIdx, setEditingInstalmentIdx] = useState<number | null>(null);
  const [editInstalment, setEditInstalment] = useState({ label: "", amount: "", dueDays: "" });

  const [showAddTestimonial, setShowAddTestimonial] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({ text: "", name: "", rating: "5" });
  const [editingTestimonialIdx, setEditingTestimonialIdx] = useState<number | null>(null);
  const [editTestimonial, setEditTestimonial] = useState({ text: "", name: "", rating: "5" });

  const [showAddFaq, setShowAddFaq] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [editingFaqIdx, setEditingFaqIdx] = useState<number | null>(null);
  const [editFaq, setEditFaq] = useState({ question: "", answer: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
          price: form.price ? Number(form.price) : 0,
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
          originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
          emiPlans: form.emiPlans.length > 0
            ? form.emiPlans.map(p => ({ label: p.label, amount: Number(p.amount) || 0, dueDays: Number(p.dueDays) || 0 }))
            : null,
          testimonials: form.testimonials.length > 0
            ? form.testimonials.map(t => ({ text: t.text, name: t.name, rating: Number(t.rating) || 5 }))
            : null,
          faqs: form.faqs.length > 0
            ? form.faqs.map(f => ({ question: f.question, answer: f.answer }))
            : null,
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create course"); return; }
      setCourses((prev) => [p.data, ...prev]);
      setForm({ title: "", subtitle: "", description: "", overviewContent: "", thumbnail: "", price: "", teacherIds: [], totalHours: "", lessonCount: "", courseRating: "", autoCalculateRating: true, enrolledStudents: "", autoUpdateEnrolled: true, learningOutcomes: [], category: "", courseLevel: "", language: "", visibility: "Public", pricingType: "Paid", originalPrice: "", emiPlans: [], testimonials: [], faqs: [] });
      setNewInstalment({ label: "", amount: "", dueDays: "" });
      setShowAddInstalment(false);
      setEditingInstalmentIdx(null);
      setNewTestimonial({ text: "", name: "", rating: "5" });
      setShowAddTestimonial(false);
      setEditingTestimonialIdx(null);
      setNewFaq({ question: "", answer: "" });
      setShowAddFaq(false);
      setEditingFaqIdx(null);
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

  async function handleDeleteCourse(id: string) {
    if (!window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        alert(payload.error ?? "Failed to delete course");
        return;
      }
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert("Network error while trying to delete the course.");
    }
  }

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

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
            <section className="grid gap-8 xl:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h2 className="text-[24px] font-bold tracking-tight text-[#0f172a]">Create New Course</h2>
                    <p className="mt-1 text-[14px] text-[#64748b]">Configure your course details below. Changes are saved as a draft.</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge tone="neutral" className="bg-[#f1f5f9] text-[#475569] border-[#e2e8f0]">Draft Mode</Badge>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="flex flex-col gap-6">
                  {/* Basic Details Card */}
                  <Surface className="overflow-hidden border border-[#e2e8f0] bg-white p-6 shadow-sm rounded-xl">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Basic Details</h3>
                    <div className="grid gap-5">
                      <Field
                        required
                        label="Course Title"
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Advanced React Patterns"
                        value={form.title}
                      />
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Subtitle" onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} value={form.subtitle} placeholder="e.g. Master the fundamentals" />
                        <Field label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category} placeholder="e.g. Design" />
                        <Field label="Course Level" onChange={e => setForm(p => ({...p, courseLevel: e.target.value}))} value={form.courseLevel} placeholder="e.g. Beginner" />
                        <Field label="Language" onChange={e => setForm(p => ({...p, language: e.target.value}))} value={form.language} placeholder="e.g. English" />
                      </div>
                      <TextAreaField
                        label="Short description"
                        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Summarize the promise, pace, and outcome."
                        rows={3}
                        value={form.description}
                      />
                      <TextAreaField
                        label="Overview Content"
                        onChange={(e) => setForm((prev) => ({ ...prev, overviewContent: e.target.value }))}
                        placeholder="Detailed paragraphs..."
                        rows={5}
                        value={form.overviewContent}
                      />
                    </div>
                  </Surface>

                  {/* Pricing Card */}
                  <Surface className="overflow-hidden border border-[#e2e8f0] bg-white p-6 shadow-sm rounded-xl">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Pricing & Plans</h3>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Price (INR)"
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        type="number"
                        min={0}
                        value={form.price}
                      />
                      <Field label="Original Price (INR)" onChange={e => setForm(p => ({...p, originalPrice: e.target.value}))} value={form.originalPrice} placeholder="e.g. 2000" type="number" />
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[14px] font-medium text-[#0f172a]">Instalment Breakdown</p>
                        </div>
                        {!showAddInstalment && editingInstalmentIdx === null && (
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setNewInstalment({ label: "", amount: "", dueDays: "" }); setShowAddInstalment(true); }}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add instalment
                          </Button>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-lg border border-[#e2e8f0] bg-white">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                              <th className="px-4 py-3 text-left font-medium text-[#64748b]">#</th>
                              <th className="px-4 py-3 text-left font-medium text-[#64748b]">Amount (₹)</th>
                              <th className="px-4 py-3 text-left font-medium text-[#64748b]">Due (days)</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {form.emiPlans.length === 0 && !showAddInstalment ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-6 text-center text-[#94a3b8]">No instalments defined.</td>
                              </tr>
                            ) : (
                              form.emiPlans.map((plan, idx) => (
                                <tr key={idx} className={cx("border-b border-[#f1f5f9] last:border-0", editingInstalmentIdx === idx ? "bg-[#f8fafc]" : "")}>
                                  {editingInstalmentIdx === idx ? (
                                    <>
                                      <td className="px-4 py-2"><input autoFocus value={editInstalment.label} onChange={e => setEditInstalment(p => ({ ...p, label: e.target.value }))} className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" /></td>
                                      <td className="px-4 py-2"><input type="number" min={0} value={editInstalment.amount} onChange={e => setEditInstalment(p => ({ ...p, amount: e.target.value }))} className="w-24 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" /></td>
                                      <td className="px-4 py-2"><input type="number" min={0} value={editInstalment.dueDays} onChange={e => setEditInstalment(p => ({ ...p, dueDays: e.target.value }))} className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" /></td>
                                      <td className="px-4 py-2 text-right">
                                        <div className="flex gap-1.5 justify-end">
                                          <Button type="button" size="sm" onClick={() => { setForm(p => ({ ...p, emiPlans: p.emiPlans.map((pl, i) => i === idx ? editInstalment : pl) })); setEditingInstalmentIdx(null); }}>Save</Button>
                                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingInstalmentIdx(null)}>Cancel</Button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-3 text-[#0f172a]">{plan.label || `${idx + 1} instalment`}</td>
                                      <td className="px-4 py-3 text-[#0f172a]">₹{plan.amount ? Number(plan.amount).toLocaleString("en-IN") : 0}</td>
                                      <td className="px-4 py-3 text-[#64748b]">{plan.dueDays || 0} days</td>
                                      <td className="px-4 py-3 text-right">
                                        <div className="flex gap-1 justify-end">
                                          <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditInstalment({ ...plan }); setEditingInstalmentIdx(idx); }}><Pencil className="h-3.5 w-3.5" /></button>
                                          <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, emiPlans: p.emiPlans.filter((_, i) => i !== idx) }))}><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))
                            )}
                            
                            {showAddInstalment && (
                              <tr className="bg-[#f8fafc]">
                                <td className="px-4 py-2"><input autoFocus value={newInstalment.label} onChange={e => setNewInstalment(p => ({ ...p, label: e.target.value }))} className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" placeholder="Label" /></td>
                                <td className="px-4 py-2"><input type="number" min={0} value={newInstalment.amount} onChange={e => setNewInstalment(p => ({ ...p, amount: e.target.value }))} className="w-24 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" placeholder="Amount" /></td>
                                <td className="px-4 py-2"><input type="number" min={0} value={newInstalment.dueDays} onChange={e => setNewInstalment(p => ({ ...p, dueDays: e.target.value }))} className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1.5 outline-none focus:border-[#0f172a]" placeholder="Days" /></td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex gap-1.5 justify-end">
                                    <Button type="button" size="sm" onClick={() => { if (!newInstalment.amount) return; setForm(p => ({ ...p, emiPlans: [...p.emiPlans, { label: newInstalment.label || `${p.emiPlans.length + 1} instalment`, amount: newInstalment.amount, dueDays: newInstalment.dueDays || '0' }] })); setNewInstalment({ label: "", amount: "", dueDays: "" }); setShowAddInstalment(false); }} disabled={!newInstalment.amount}>Add</Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddInstalment(false)}>Cancel</Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Surface>

                  {/* Social Proof Card */}
                  <Surface className="overflow-hidden border border-[#e2e8f0] bg-white p-6 shadow-sm rounded-xl">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Social Proof & FAQ</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[14px] font-medium text-[#0f172a]">Student Reviews</p>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddTestimonial(!showAddTestimonial)}>
                            {showAddTestimonial ? "Cancel" : <><Plus className="mr-1 h-3.5 w-3.5" /> Add Review</>}
                          </Button>
                        </div>
                        
                        {showAddTestimonial && (
                          <div className="grid gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 mb-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Student Name" value={newTestimonial.name} onChange={e => setNewTestimonial(p => ({...p, name: e.target.value}))} />
                              <Field label="Rating (1-5)" type="number" min={1} max={5} value={newTestimonial.rating} onChange={e => setNewTestimonial(p => ({...p, rating: e.target.value}))} />
                            </div>
                            <TextAreaField label="Review Text" value={newTestimonial.text} onChange={e => setNewTestimonial(p => ({...p, text: e.target.value}))} />
                            <Button type="button" size="sm" onClick={() => {
                              if (newTestimonial.name && newTestimonial.text) {
                                setForm(p => ({ ...p, testimonials: [...p.testimonials, newTestimonial] }));
                                setNewTestimonial({ name: "", text: "", rating: "5" });
                                setShowAddTestimonial(false);
                              }
                            }}>Add Review</Button>
                          </div>
                        )}

                        {form.testimonials.length > 0 && (
                          <div className="rounded-lg border border-[#e2e8f0] bg-white divide-y divide-[#f1f5f9]">
                            {form.testimonials.map((t, idx) => (
                              <div key={idx} className="p-4 flex items-start justify-between gap-4">
                                {editingTestimonialIdx === idx ? (
                                  <div className="grid gap-3 w-full">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <Field label="Student Name" value={editTestimonial.name} onChange={e => setEditTestimonial(p => ({...p, name: e.target.value}))} />
                                      <Field label="Rating" type="number" min={1} max={5} value={editTestimonial.rating} onChange={e => setEditTestimonial(p => ({...p, rating: e.target.value}))} />
                                    </div>
                                    <TextAreaField label="Review Text" value={editTestimonial.text} onChange={e => setEditTestimonial(p => ({...p, text: e.target.value}))} />
                                    <div className="flex gap-2">
                                      <Button type="button" size="sm" onClick={() => {
                                        const updated = [...form.testimonials];
                                        updated[idx] = editTestimonial;
                                        setForm(p => ({ ...p, testimonials: updated }));
                                        setEditingTestimonialIdx(null);
                                      }}>Save</Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTestimonialIdx(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#0f172a]">{t.name} <span className="text-[#f59e0b] font-normal">({t.rating}★)</span></p>
                                      <p className="mt-1 text-[13px] text-[#475569]">"{t.text}"</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditTestimonial(t); setEditingTestimonialIdx(idx); }}>
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, testimonials: p.testimonials.filter((_, i) => i !== idx) }))}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-[#f1f5f9]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[14px] font-medium text-[#0f172a]">FAQs</p>
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddFaq(!showAddFaq)}>
                            {showAddFaq ? "Cancel" : <><Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ</>}
                          </Button>
                        </div>
                        
                        {showAddFaq && (
                          <div className="grid gap-3 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 mb-4">
                            <Field label="Question" value={newFaq.question} onChange={e => setNewFaq(p => ({...p, question: e.target.value}))} />
                            <TextAreaField label="Answer" value={newFaq.answer} onChange={e => setNewFaq(p => ({...p, answer: e.target.value}))} />
                            <Button type="button" size="sm" onClick={() => {
                              if (newFaq.question && newFaq.answer) {
                                setForm(p => ({ ...p, faqs: [...p.faqs, newFaq] }));
                                setNewFaq({ question: "", answer: "" });
                                setShowAddFaq(false);
                              }
                            }}>Add FAQ</Button>
                          </div>
                        )}

                        {form.faqs.length > 0 && (
                          <div className="rounded-lg border border-[#e2e8f0] bg-white divide-y divide-[#f1f5f9]">
                            {form.faqs.map((f, idx) => (
                              <div key={idx} className="p-4 flex items-start justify-between gap-4">
                                {editingFaqIdx === idx ? (
                                  <div className="grid gap-3 w-full">
                                    <Field label="Question" value={editFaq.question} onChange={e => setEditFaq(p => ({...p, question: e.target.value}))} />
                                    <TextAreaField label="Answer" value={editFaq.answer} onChange={e => setEditFaq(p => ({...p, answer: e.target.value}))} />
                                    <div className="flex gap-2">
                                      <Button type="button" size="sm" onClick={() => {
                                        const updated = [...form.faqs];
                                        updated[idx] = editFaq;
                                        setForm(p => ({ ...p, faqs: updated }));
                                        setEditingFaqIdx(null);
                                      }}>Save</Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFaqIdx(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#0f172a]">Q: {f.question}</p>
                                      <p className="mt-1 text-[13px] text-[#475569]">A: {f.answer}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditFaq(f); setEditingFaqIdx(idx); }}>
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, faqs: p.faqs.filter((_, i) => i !== idx) }))}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Surface>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-2 mb-8">
                    {error && <p className="text-[13px] font-medium text-[#dc2626] mr-auto">{error}</p>}
                    <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    <Button type="submit" loading={saving}>{saving ? "Creating…" : "Create Course"}</Button>
                  </div>
                </form>
              </div>

              {/* Right Sidebar */}
              <div className="sticky top-6 self-start space-y-6">
                {/* Course Preview Card */}
                <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xl shadow-black/[0.03]">
                  <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                    {form.thumbnail ? (
                      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${form.thumbnail})` }} />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <ImagePlus className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 p-5 text-white w-full">
                      <Badge className="bg-white/20 text-white backdrop-blur-md border-white/10 mb-3">{form.category || "Category"}</Badge>
                      <h3 className="text-xl font-bold leading-tight">{form.title.trim() || "Course Title Preview"}</h3>
                      <p className="mt-1.5 text-sm text-white/80 line-clamp-2">{form.description.trim() || "Course description will appear here..."}</p>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900">{priceLabel}</span>
                      <span className="text-slate-500">{form.totalHours ? `${form.totalHours} hours` : "Duration"}</span>
                    </div>
                  </div>
                </div>

                {/* Settings & Thumbnail Form */}
                <Surface className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                  <h4 className="font-semibold text-slate-900 mb-4">Media & Settings</h4>
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">Thumbnail Upload</label>
                      <div className="flex flex-col gap-3">
                        <Button type="button" variant="secondary" className="w-full" loading={thumbnailUploading} onClick={() => thumbnailInputRef.current?.click()}>
                          {thumbnailUploading ? "Uploading…" : "Upload Image"}
                        </Button>
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
                        {thumbnailUploadError && <p className="text-xs text-red-500">{thumbnailUploadError}</p>}
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                          <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">or use URL</span></div>
                        </div>
                        <Field value={form.thumbnail} onChange={(e) => setForm((p) => ({ ...p, thumbnail: e.target.value }))} placeholder="https://..." />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <label className="text-sm font-medium text-slate-700 block mb-2">Assigned Teachers</label>
                      <div className="max-h-[160px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                        {teachers.length === 0 ? (
                          <p className="text-sm text-slate-500">No teachers found.</p>
                        ) : (
                          teachers.map((teacher) => {
                            const isSelected = form.teacherIds.includes(teacher.id);
                            return (
                              <button
                                key={teacher.id}
                                type="button"
                                onClick={() => setForm((p) => ({ ...p, teacherIds: isSelected ? p.teacherIds.filter((id) => id !== teacher.id) : [...p.teacherIds, teacher.id] }))}
                                className={cx("flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm transition-all", isSelected ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-300")}
                              >
                                <span className={cx("font-medium", isSelected ? "text-slate-900" : "text-slate-600")}>{getTeacherDisplayName(teacher)}</span>
                                {isSelected && <Check className="h-4 w-4 text-slate-900" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
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
            <div className="flex flex-col gap-4 border-b border-[#eef0f3] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">Course Library</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full rounded-full border border-[#cbd5e1] pl-9 pr-4 py-2 text-sm outline-none focus:border-[#0f172a] focus:ring-1 focus:ring-[#0f172a]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)}
                </div>
              ) : (
                <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 p-6">
                  {paginatedCourses.map((course) => (
                    <AnimCard key={course.id}>
                      <div className="group relative overflow-hidden rounded-[20px] bg-white p-[10px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform hover:-translate-y-1">
                        <Link href={`/admin/courses/${course.id}`} className="absolute inset-0 z-0" />
                        <article className="relative z-10 pointer-events-none">
                          <div className="overflow-hidden rounded-[16px] bg-[#d0d0d0]">
                            <div
                              aria-hidden="true"
                              className="h-[184px] w-full bg-cover bg-center"
                              style={{
                                backgroundImage: course.thumbnail
                                  ? `linear-gradient(180deg, rgba(8, 16, 24, 0.04), rgba(8, 16, 24, 0.18)), url("${course.thumbnail}")`
                                  : `url("https://api.dicebear.com/9.x/shapes/svg?seed=973b6412-1165-4257-8071-b30234e453cb")`,
                              }}
                            />
                          </div>

                          <div className="space-y-3 px-1 pb-1 pt-4">
                            <div className="space-y-1">
                              <h3 className="text-[16px] font-semibold leading-[1.15] text-black group-hover:text-blue-600 transition-colors">
                                {course.title}
                              </h3>
                              <p className="text-[12px] text-[#959595]">
                                by {course.teachers?.[0]?.name ?? "Expert Mentors"}
                              </p>
                              <p className="text-[12px] font-medium text-black">
                                {course._count?.enrollments ?? 0} student{(course._count?.enrollments ?? 0) === 1 ? "" : "s"}
                              </p>
                            </div>

                            <div className="flex items-end justify-between gap-4 pointer-events-auto">
                              <div className="space-y-1 pointer-events-none">
                                <p className="text-[12px] font-medium text-black">
                                  {course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}` : "Free"}
                                </p>
                                <p className={cx("text-[12px]", course.isPublished ? "text-[#4caf50]" : "text-[#94a3b8]")}>
                                  {course.isPublished ? "Published" : "Draft"}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingCourse(course);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteCourse(course.id);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-[10px] bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      </div>
                    </AnimCard>
                  ))}
                </StaggerGrid>
              )}
            </div>
            
            {!loading && filteredCourses.length > 0 && (
              <div className="flex items-center justify-end gap-4 border-t border-[#eef0f3] px-6 py-4 text-sm text-[#64748b]">
                <div>
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCourses.length)}–
                  {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of {filteredCourses.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded p-1 hover:bg-[#f1f5f9] disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="rounded p-1 hover:bg-[#f1f5f9] disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            {!loading && filteredCourses.length === 0 && (
              <div className="p-8 text-center text-sm text-[#64748b]">
                No courses found matching "{searchQuery}"
              </div>
            )}
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
