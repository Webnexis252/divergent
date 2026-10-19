"use client";

import { useEffect, useState, useCallback, lazy, Suspense, useRef } from "react";
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
  Star,
  X,
} from "lucide-react";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import PricingPlanBuilder, { PricingPlan } from "../_components/PricingPlanBuilder";
import { formatShortDate } from "@/lib/date-format";
import { Field, TextAreaField, SelectField } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cx } from "@/lib/cx";
import Link from "next/link";
import {
  AdminEmptyState,
  AdminPageHeader,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminInputClass,
  adminPanelClass,
} from "../_components/admin-ui";

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
    examCount: "",
    courseRating: "",
    autoCalculateRating: true,
    enrolledStudents: "",
    autoUpdateEnrolled: true,
    learningOutcomes: [] as string[],
    category: "",
    courseLevel: "",
    language: "",
    status: "DRAFT",
    pricingType: "PAID",
    originalPrice: "",
    isInstallmentBased: false,
    emiPlans: [] as PricingPlan[],
    testimonials: [] as Array<{ text: string; name: string; rating: string }>,
    faqs: [] as Array<{ question: string; answer: string }>,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [teachersError, setTeachersError] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

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
          examCount: form.examCount ? Number(form.examCount) : undefined,
          courseRating: form.courseRating ? Number(form.courseRating) : undefined,
          autoCalculateRating: form.autoCalculateRating,
          enrolledStudents: form.enrolledStudents ? Number(form.enrolledStudents) : undefined,
          autoUpdateEnrolled: form.autoUpdateEnrolled,
          learningOutcomes: form.learningOutcomes,
          category: form.category,
          courseLevel: form.courseLevel,
          language: form.language,
          isPublished: form.status === "PUBLISHED" || form.status === "UNLISTED",
          visibility: form.status === "UNLISTED" ? "UNLISTED" : "PUBLIC",
          pricingType: form.pricingType,
          originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
          isInstallmentBased: form.isInstallmentBased,
          emiPlans: form.emiPlans.length > 0
            ? form.emiPlans.map(plan => ({
                id: plan.id,
                name: plan.name,
                installments: plan.installments.map(p => ({
                  label: p.label,
                  amount: Number(p.amount) || 0,
                  dueDays: Number(p.dueDays) || 0,
                })),
              }))
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
      setForm({ title: "", subtitle: "", description: "", overviewContent: "", thumbnail: "", price: "", teacherIds: [], totalHours: "", lessonCount: "", examCount: "", courseRating: "", autoCalculateRating: true, enrolledStudents: "", autoUpdateEnrolled: true, learningOutcomes: [], category: "", courseLevel: "", language: "", status: "DRAFT", pricingType: "PAID", originalPrice: "", isInstallmentBased: false, emiPlans: [], testimonials: [], faqs: [] });
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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Course library"
            icon={BookOpen}
            title="Courses"
            description="Manage published courses, create new ones and track enrollment growth."
            actions={
              <button type="button" onClick={() => setShowCreate(!showCreate)} className={showCreate ? adminButton.secondary : adminButton.primary}>
                {showCreate ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {showCreate ? "Close creator" : "New course"}
              </button>
            }
          />
        </RevealSection>

        {/* Create form */}
        {showCreate && (
          <RevealSection>
            <section className="grid gap-8 xl:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-[#0f172a]">Create new course</h2>
                    <p className="mt-1 text-[14px] text-[#64748b]">Configure your course details below. Changes are saved as a draft.</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <StatusBadge>Draft</StatusBadge>
                  </div>
                </div>

                <form onSubmit={handleCreate} className="flex flex-col gap-6">
                  {/* Basic Details Card */}
                  <section className="rounded-[20px] border border-[#e8edf3] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
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
                        <SelectField label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category}>
                          <option value="">Select Category</option>
                          <option value="UCEED">UCEED</option>
                          <option value="NIFT">NIFT</option>
                          <option value="NID">NID</option>
                          <option value="MOCK">MOCK</option>
                          <option value="DROPPER">DROPPER</option>
                        </SelectField>
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
                  </section>

                  {/* Pricing Card */}
                  <section className="rounded-[20px] border border-[#e8edf3] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] mb-5">Pricing & Plans</h3>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Price (INR)" onChange={e => setForm(p => ({...p, price: e.target.value}))} value={form.price} placeholder="e.g. 1500" type="number" />
                      <Field label="Original Price (INR)" onChange={e => setForm(p => ({...p, originalPrice: e.target.value}))} value={form.originalPrice} placeholder="e.g. 2000" type="number" />
                      <Field label="Number of Lessons" onChange={e => setForm(p => ({...p, lessonCount: e.target.value}))} value={form.lessonCount} placeholder="e.g. 24" type="number" />
                      <Field label="Number of Exams" onChange={e => setForm(p => ({...p, examCount: e.target.value}))} value={form.examCount} placeholder="e.g. 3" type="number" />
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#f1f5f9]">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-5 items-center">
                          <input
                            id="installment-toggle"
                            type="checkbox"
                            checked={form.isInstallmentBased}
                            onChange={(e) =>
                              setForm((p) => ({ ...p, isInstallmentBased: e.target.checked }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                          />
                        </div>
                        <div className="text-sm">
                          <label htmlFor="installment-toggle" className="font-medium text-slate-700">
                            Enable Custom Instalment Plans
                          </label>
                          <p className="text-slate-500">Allow students to pay for this course in multiple instalments.</p>
                        </div>
                      </div>

                      {form.isInstallmentBased && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <PricingPlanBuilder
                            plans={form.emiPlans}
                            onChange={(plans) => setForm((p) => ({ ...p, emiPlans: plans }))}
                          />
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Social Proof Card */}
                  <section className="rounded-[20px] border border-[#e8edf3] bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
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
                                      <p className="text-[14px] font-semibold text-[#0f172a]">{t.name} <span className="inline-flex items-center gap-0.5 align-middle font-normal text-[#f59e0b]">({t.rating}<Star className="h-3.5 w-3.5 fill-current" />)</span></p>
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
                  </section>

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

                {/* Status & Visibility */}
                <section className="rounded-[20px] border border-[#e8edf3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                  <h4 className="font-semibold text-slate-900 mb-4">Status & Visibility</h4>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="course-status" 
                        value="PUBLISHED"
                        checked={form.status === "PUBLISHED"}
                        onChange={() => setForm(p => ({...p, status: "PUBLISHED"}))}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block text-sm font-semibold text-slate-900">Published</span>
                        <span className="block text-xs text-slate-500 mt-0.5">Visible to all students in the catalog.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="course-status" 
                        value="UNLISTED"
                        checked={form.status === "UNLISTED"}
                        onChange={() => setForm(p => ({...p, status: "UNLISTED"}))}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block text-sm font-semibold text-slate-900">Unlisted</span>
                        <span className="block text-xs text-slate-500 mt-0.5">Hidden from students. Can be added to Bundles.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="radio" 
                        name="course-status" 
                        value="DRAFT"
                        checked={form.status === "DRAFT"}
                        onChange={() => setForm(p => ({...p, status: "DRAFT"}))}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="block text-sm font-semibold text-slate-900">Draft / Unpublished</span>
                        <span className="block text-xs text-slate-500 mt-0.5">Hidden everywhere. Saved for later.</span>
                      </div>
                    </label>
                  </div>
                </section>

                {/* Settings & Thumbnail Form */}
                <section className="rounded-[20px] border border-[#e8edf3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
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
                </section>
              </div>
            </section>
          </RevealSection>
        )}

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminStatCard index={0} title="Total courses" value={loading ? "…" : courses.length} caption="All courses in the system." icon={<BookOpen />} tone="sky" />
          <AdminStatCard index={1} title="Published" value={loading ? "…" : published} caption="Currently visible to students." icon={<ShieldCheck />} tone="emerald" />
          <AdminStatCard index={2} title="Total enrollments" value={loading ? "…" : totalEnrollments} caption="Combined learners across all courses." icon={<GraduationCap />} tone="amber" />
        </StaggerGrid>

        {/* Course table */}
        <RevealSection>
          <section className={adminPanelClass}>
            <div className="flex flex-col gap-4 border-b border-[#eef1f5] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#e0f2fe] text-[#0284c7]">
                  <LayoutPanelTop className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Course library</h2>
                  <p className="mt-1 text-[13px] text-[#64748b]">Open a course to manage its curriculum, exams and students</p>
                </div>
              </div>
              <label className="relative w-full sm:w-72">
                <span className="sr-only">Search courses</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search courses…"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className={`${adminInputClass} pl-10`}
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-[16px] bg-[#f1f5f9]" />)}
                </div>
              ) : (
                <StaggerGrid className="grid gap-4 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedCourses.map((course) => (
                    <AnimCard key={course.id}>
                      <div className="group relative overflow-hidden rounded-[20px] border border-[#eef1f5] bg-white p-2.5 transition-[border-color,box-shadow] hover:border-[#e2e8f0] hover:shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
                        <Link href={`/admin/courses/${course.id}`} className="absolute inset-0 z-0" aria-label={`Open ${course.title}`} />
                        <article className="relative z-10 pointer-events-none">
                          <div className="overflow-hidden rounded-[14px] bg-[#f1f5f9]">
                            <div
                              aria-hidden="true"
                              className="h-[176px] w-full bg-cover bg-center"
                              style={{
                                backgroundImage: course.thumbnail
                                  ? `linear-gradient(180deg, rgba(8, 16, 24, 0.04), rgba(8, 16, 24, 0.18)), url("${course.thumbnail}")`
                                  : `url("/images/course-placeholder.svg")`,
                              }}
                            />
                          </div>

                          <div className="space-y-3 px-1.5 pb-1.5 pt-4">
                            <div className="space-y-1">
                              <h3 className="text-[15px] font-semibold leading-snug text-[#0f172a] transition-colors group-hover:text-[#0369a1]">
                                {course.title}
                              </h3>
                              <p className="text-[12px] text-[#64748b]">
                                by {course.teachers?.[0]?.name ?? "Expert Mentors"} · {course._count?.enrollments ?? 0} student{(course._count?.enrollments ?? 0) === 1 ? "" : "s"}
                              </p>
                            </div>

                            <div className="pointer-events-auto flex items-center justify-between gap-3 border-t border-[#f1f5f9] pt-3">
                              <div className="pointer-events-none flex items-center gap-2">
                                <span className="text-[14px] font-semibold tabular-nums text-[#0f172a]">
                                  {course.price > 0 ? `₹${course.price.toLocaleString("en-IN")}` : "Free"}
                                </span>
                                <StatusBadge tone={course.isPublished ? "good" : "neutral"}>
                                  {course.isPublished ? "Published" : "Draft"}
                                </StatusBadge>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setEditingCourse(course);
                                  }}
                                  className={adminButtonSm.secondary}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteCourse(course.id);
                                  }}
                                  aria-label={`Delete ${course.title}`}
                                  className={adminButtonSm.danger}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
              <div className="flex items-center justify-end gap-4 border-t border-[#eef1f5] px-6 py-4 text-[12px] font-medium text-[#64748b]">
                <div>
                  {Math.min((currentPage - 1) * itemsPerPage + 1, filteredCourses.length)}–
                  {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of {filteredCourses.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="grid h-8 w-8 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="grid h-8 w-8 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            {!loading && filteredCourses.length === 0 && (
              <div className="p-5 sm:p-6">
                <AdminEmptyState
                  icon={BookOpen}
                  title={searchQuery ? "No matching courses" : "No courses yet"}
                  description={searchQuery ? `Nothing matches "${searchQuery}".` : "Create your first course with New course."}
                />
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
