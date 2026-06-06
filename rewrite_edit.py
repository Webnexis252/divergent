import re

with open("src/app/admin/courses/EditCourseModal.tsx", "w") as f:
    f.write("""\"use client\";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Trash2,
  Pencil,
  ImagePlus,
  Check,
  Eye,
  EyeOff,
  Settings,
  CreditCard,
  BookOpen,
  MessageSquareHeart,
  ClipboardList,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { Button, buttonStyles } from "@/components/ui/button";
import { Field, TextAreaField } from "@/components/ui/field";

import type { Course, Teacher } from "./_types";
import { teacherRoleLabel, getTeacherDisplayName } from "./_types";
import { uploadCourseThumbnail } from "./upload-thumbnail";

type TabValue = "general" | "pricing" | "curriculum" | "social";

export default function EditCourseModal({
  course,
  teachers,
  teachersLoading,
  onClose,
  onSaved,
}: {
  course: Course;
  teachers: Teacher[];
  teachersLoading?: boolean;
  onClose: () => void;
  onSaved: (course: Course) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabValue>("general");
  
  const [form, setForm] = useState({
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    overviewContent: course.overviewContent ?? "",
    thumbnail: course.thumbnail ?? "",
    price: course.price.toString(),
    teacherIds: course.teachers?.map(t => t.id) ?? [],
    isPublished: course.isPublished,
    totalHours: course.totalHours?.toString() ?? "",
    lessonCount: course.lessonCount?.toString() ?? "",
    courseRating: course.courseRating?.toString() ?? "",
    category: course.category ?? "",
    courseLevel: course.courseLevel ?? "",
    language: course.language ?? "",
    originalPrice: course.originalPrice?.toString() ?? "",
    emiPlans: (course.emiPlans as Array<{ label: string; amount: string; dueDays: string }> | null) ?? [],
    testimonials: (course.testimonials as Array<{ text: string; name: string; rating: string }> | null) ?? [],
    faqs: (course.faqs as Array<{ question: string; answer: string }> | null) ?? [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailUploadError, setThumbnailUploadError] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  // Instalment builder state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newInstalment, setNewInstalment] = useState({ label: "", amount: "", dueDays: "" });
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editInstalment, setEditInstalment] = useState({ label: "", amount: "", dueDays: "" });

  // Testimonial builder state
  const [showAddTestimonial, setShowAddTestimonial] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({ text: "", name: "", rating: "5" });
  const [editingTestimonialIdx, setEditingTestimonialIdx] = useState<number | null>(null);
  const [editTestimonial, setEditTestimonial] = useState({ text: "", name: "", rating: "5" });

  // FAQ builder state
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [editingFaqIdx, setEditingFaqIdx] = useState<number | null>(null);
  const [editFaq, setEditFaq] = useState({ question: "", answer: "" });

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
          price: form.price ? Number(form.price) : 0,
          teacherIds: form.teacherIds,
          isPublished: form.isPublished,
          totalHours: form.totalHours ? Number(form.totalHours) : undefined,
          lessonCount: form.lessonCount ? Number(form.lessonCount) : undefined,
          courseRating: form.courseRating ? Number(form.courseRating) : undefined,
          category: form.category || undefined,
          courseLevel: form.courseLevel || undefined,
          language: form.language || undefined,
          originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
          emiPlans: form.emiPlans.length > 0
            ? form.emiPlans.map((p) => ({
                label: p.label,
                amount: Number(p.amount) || 0,
                dueDays: Number(p.dueDays) || 0,
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

  const TABS: { id: TabValue; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
    { id: "pricing", label: "Pricing & Plans", icon: <CreditCard className="h-4 w-4" /> },
    { id: "curriculum", label: "Curriculum", icon: <BookOpen className="h-4 w-4" /> },
    { id: "social", label: "Social Proof", icon: <MessageSquareHeart className="h-4 w-4" /> },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-[#0f172a]/70 px-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="relative w-full max-w-[1000px] flex min-h-[700px] overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-[0_40px_80px_rgba(0,0,0,0.2)]"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Sidebar */}
        <div className="w-[260px] flex-shrink-0 border-r border-[#e2e8f0] bg-[#f8fafc] flex flex-col">
          <div className="p-6 pb-2">
            <h2 className="text-[20px] font-bold tracking-tight text-[#0f172a]">Edit Course</h2>
            <p className="mt-1 text-[13px] text-[#64748b]">Configure your course settings</p>
          </div>
          
          <div className="flex-1 px-3 py-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cx(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-white text-[#0ea5e9] shadow-sm ring-1 ring-black/5"
                    : "text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-[#e2e8f0]">
             <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isPublished: !p.isPublished }))}
                className={cx(
                  "flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-[14px] font-semibold transition-all",
                  form.isPublished
                    ? "border-[#bbf7d0] bg-[#ecfdf5] text-[#15803d] hover:bg-[#dcfce7]"
                    : "border-[#fde68a] bg-[#fffbeb] text-[#b45309] hover:bg-[#fef3c7]"
                )}
              >
                {form.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {form.isPublished ? "Course is Published" : "Course is Draft"}
              </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 grid h-8 w-8 place-items-center rounded-full bg-[#f1f5f9] text-[#64748b] transition hover:bg-[#e2e8f0] hover:text-[#0f172a]"
          >
            <X className="h-4 w-4" />
          </button>

          <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === "general" && (
                  <motion.div
                    key="general"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-[18px] font-bold text-[#0f172a]">General Information</h3>
                      <p className="mt-1 text-[13px] text-[#64748b]">Basic details that appear on the course card.</p>
                    </div>

                    <div className="grid gap-5">
                      <Field
                        required
                        label="Course Title"
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="e.g. Advanced React Patterns"
                      />
                      
                      <div className="grid gap-5 sm:grid-cols-2">
                        <Field label="Subtitle/Tagline" onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} value={form.subtitle} placeholder="e.g. Master the fundamentals" />
                        <Field label="Category" onChange={e => setForm(p => ({...p, category: e.target.value}))} value={form.category} placeholder="e.g. Design" />
                        <Field label="Course Level" onChange={e => setForm(p => ({...p, courseLevel: e.target.value}))} value={form.courseLevel} placeholder="e.g. Beginner" />
                        <Field label="Language" onChange={e => setForm(p => ({...p, language: e.target.value}))} value={form.language} placeholder="e.g. English" />
                      </div>

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

                    <div className="pt-4 border-t border-[#e2e8f0]">
                      <label className="text-[14px] font-semibold text-[#1e293b] mb-3 block">Course Thumbnail</label>
                      <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-wrap gap-3">
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

                          {thumbnailUploadError && (
                            <p className="text-[13px] font-medium text-[#dc2626]">{thumbnailUploadError}</p>
                          )}

                          {form.thumbnail && (
                            <div className="overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white max-w-[400px]">
                              <div
                                className="aspect-[16/9] w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${form.thumbnail})` }}
                              />
                            </div>
                          )}

                          <div className="mt-2">
                             <Field
                                label="Or Use URL"
                                value={form.thumbnail}
                                onChange={(e) => setForm((p) => ({ ...p, thumbnail: e.target.value }))}
                                placeholder="https://..."
                              />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0]">
                      <label className="text-[14px] font-semibold text-[#1e293b] mb-3 block">Assigned Teachers</label>
                      <div className="grid gap-2 sm:grid-cols-2 max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
                        {teachers.map((teacher) => {
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
                                "flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-all duration-200",
                                isSelected 
                                  ? "border-[#0ea5e9] bg-[#f0f9ff] ring-1 ring-[#0ea5e9]" 
                                  : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
                              )}
                            >
                              <div className="flex flex-col">
                                <span className={cx("text-[13px] font-semibold", isSelected ? "text-[#0ea5e9]" : "text-[#1e293b]")}>
                                  {getTeacherDisplayName(teacher)}
                                </span>
                                {teacher.email && (
                                  <span className={cx("text-[11px] font-medium", isSelected ? "text-[#0ea5e9]/70" : "text-[#64748b]")}>
                                    {teacher.email}
                                  </span>
                                )}
                              </div>
                              <div className={cx(
                                "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                                isSelected ? "border-[#0ea5e9] bg-[#0ea5e9]" : "border-[#cbd5e1] bg-white"
                              )}>
                                {isSelected && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "pricing" && (
                  <motion.div
                    key="pricing"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-[18px] font-bold text-[#0f172a]">Pricing & Plans</h3>
                      <p className="mt-1 text-[13px] text-[#64748b]">Configure how students pay for this course.</p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field
                        label="Price (INR)"
                        value={form.price}
                        onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                        placeholder="0"
                        type="number"
                        min={0}
                        hint="Set to 0 for free access"
                      />
                      <Field 
                        label="Original Price (INR)" 
                        onChange={e => setForm(p => ({...p, originalPrice: e.target.value}))} 
                        value={form.originalPrice} 
                        placeholder="e.g. 2000" 
                        type="number" 
                        hint="Crossed out price" 
                      />
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[14px] font-semibold text-[#1e293b]">Instalment Breakdown</p>
                          <p className="mt-0.5 text-[13px] text-[#64748b]">Define custom payment instalments</p>
                        </div>
                        {!showAddForm && editingIdx === null && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => { setNewInstalment({ label: "", amount: "", dueDays: "" }); setShowAddForm(true); }}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add instalment
                          </Button>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
                              <th className="px-4 py-3 text-left font-semibold text-[#64748b]">#</th>
                              <th className="px-4 py-3 text-left font-semibold text-[#64748b]">Amount (₹)</th>
                              <th className="px-4 py-3 text-left font-semibold text-[#64748b]">Due (days)</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody>
                            {form.emiPlans.length === 0 && !showAddForm ? (
                              <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-[13px] text-[#94a3b8]">
                                  No instalments defined. Click &ldquo;Add instalment&rdquo; to create one.
                                </td>
                              </tr>
                            ) : (
                              form.emiPlans.map((plan, idx) => (
                                <tr key={idx} className={cx("border-b border-[#e2e8f0] last:border-0", editingIdx === idx ? "bg-[#f0f9ff]" : "hover:bg-[#f8fafc]")}>
                                  {editingIdx === idx ? (
                                    <>
                                      <td className="px-4 py-2">
                                        <input
                                          autoFocus
                                          value={editInstalment.label}
                                          onChange={e => setEditInstalment(p => ({ ...p, label: e.target.value }))}
                                          className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] outline-none focus:border-[#0ea5e9]"
                                          placeholder="e.g. 1st instalment"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number" min={0}
                                          value={editInstalment.amount}
                                          onChange={e => setEditInstalment(p => ({ ...p, amount: e.target.value }))}
                                          className="w-24 rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] outline-none focus:border-[#0ea5e9]"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number" min={0}
                                          value={editInstalment.dueDays}
                                          onChange={e => setEditInstalment(p => ({ ...p, dueDays: e.target.value }))}
                                          className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] outline-none focus:border-[#0ea5e9]"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-1.5 justify-end">
                                          <Button type="button" size="sm" onClick={() => {
                                            setForm(p => ({
                                              ...p,
                                              emiPlans: p.emiPlans.map((pl, i) => i === idx ? editInstalment : pl)
                                            }));
                                            setEditingIdx(null);
                                          }}>Save</Button>
                                          <Button type="button" size="sm" variant="ghost" onClick={() => setEditingIdx(null)}>Cancel</Button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td className="px-4 py-3 font-medium text-[#0f172a]">{plan.label || `${idx + 1} instalment`}</td>
                                      <td className="px-4 py-3 text-[#0f172a]">₹{plan.amount ? Number(plan.amount).toLocaleString("en-IN") : 0}</td>
                                      <td className="px-4 py-3 text-[#64748b]">{plan.dueDays || 0} days</td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 justify-end">
                                          <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditInstalment({ ...plan }); setEditingIdx(idx); }}>
                                            <Pencil className="h-4 w-4" />
                                          </button>
                                          <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, emiPlans: p.emiPlans.filter((_, i) => i !== idx) }))}>
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))
                            )}
                            
                            {showAddForm && (
                              <tr className="bg-[#f0f9ff]">
                                <td className="px-4 py-2">
                                  <input
                                    autoFocus
                                    value={newInstalment.label}
                                    onChange={e => setNewInstalment(p => ({ ...p, label: e.target.value }))}
                                    className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] outline-none focus:border-[#0ea5e9]"
                                    placeholder={`${form.emiPlans.length + 1} instalment`}
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" min={0} value={newInstalment.amount} onChange={e => setNewInstalment(p => ({ ...p, amount: e.target.value }))} className="w-24 rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] outline-none focus:border-[#0ea5e9]" placeholder="0" />
                                </td>
                                <td className="px-4 py-2">
                                  <input type="number" min={0} value={newInstalment.dueDays} onChange={e => setNewInstalment(p => ({ ...p, dueDays: e.target.value }))} className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1.5 text-[13px] outline-none focus:border-[#0ea5e9]" placeholder="0" />
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <Button type="button" size="sm" onClick={() => {
                                      if (!newInstalment.amount) return;
                                      setForm(p => ({
                                        ...p, emiPlans: [...p.emiPlans, { label: newInstalment.label || `${p.emiPlans.length + 1} instalment`, amount: newInstalment.amount, dueDays: newInstalment.dueDays || '0' }]
                                      }));
                                      setNewInstalment({ label: "", amount: "", dueDays: "" });
                                      setShowAddForm(false);
                                    }} disabled={!newInstalment.amount}>Add</Button>
                                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {form.emiPlans.length > 0 && (
                        <p className="mt-2 text-[12px] text-[#64748b]">Total: ₹{form.emiPlans.reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === "curriculum" && (
                  <motion.div
                    key="curriculum"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-[18px] font-bold text-[#0f172a]">Curriculum & Stats</h3>
                      <p className="mt-1 text-[13px] text-[#64748b]">Manage the course contents and display metrics.</p>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-3">
                      <Field label="Total Hours" onChange={e => setForm(p => ({...p, totalHours: e.target.value}))} value={form.totalHours} placeholder="e.g. 12" type="number" />
                      <Field label="Number of Lessons" onChange={e => setForm(p => ({...p, lessonCount: e.target.value}))} value={form.lessonCount} placeholder="e.g. 24" type="number" />
                      <Field label="Course Rating" onChange={e => setForm(p => ({...p, courseRating: e.target.value}))} value={form.courseRating} placeholder="e.g. 4.8" type="number" step="0.1" />
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-[14px] font-semibold text-[#1e293b]">Chapters & Lessons</p>
                          <p className="mt-0.5 text-[13px] text-[#64748b]">Manage video lessons, documents, and resources.</p>
                        </div>
                      </div>
                      <div className="rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] text-[#64748b]">Add or manage chapters and lessons in a separate builder.</p>
                          <a
                            href={`/admin/courses/${course.id}/chapters`}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0ea5e9] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0284c7]"
                          >
                            <BookOpen className="h-4 w-4" />
                            Manage Curriculum
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0]">
                      <div className="flex items-center justify-between">
                         <div>
                            <p className="text-[14px] font-semibold text-[#1e293b]">Exams</p>
                            <p className="mt-0.5 text-[13px] text-[#64748b]">Create and manage exams for this course.</p>
                         </div>
                         <a
                            href={`/admin/courses/${course.id}/exams`}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#334155]"
                         >
                            <ClipboardList className="h-4 w-4" />
                            Manage Exams
                         </a>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "social" && (
                  <motion.div
                    key="social"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-8"
                  >
                    <div>
                      <h3 className="text-[18px] font-bold text-[#0f172a]">Social Proof & FAQ</h3>
                      <p className="mt-1 text-[13px] text-[#64748b]">Add reviews and answer common questions to improve conversion.</p>
                    </div>

                    {/* Testimonials */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[14px] font-semibold text-[#1e293b]">Student Reviews</p>
                        {!showAddTestimonial && editingTestimonialIdx === null && (
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddTestimonial(true)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Review
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {showAddTestimonial && (
                          <div className="grid gap-4 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field label="Student Name" value={newTestimonial.name} onChange={e => setNewTestimonial(p => ({...p, name: e.target.value}))} placeholder="e.g. John Doe" />
                              <Field label="Rating (1-5)" type="number" min={1} max={5} value={newTestimonial.rating} onChange={e => setNewTestimonial(p => ({...p, rating: e.target.value}))} />
                            </div>
                            <TextAreaField label="Review Text" value={newTestimonial.text} onChange={e => setNewTestimonial(p => ({...p, text: e.target.value}))} placeholder="e.g. This course changed my life..." />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={() => {
                                if (newTestimonial.name && newTestimonial.text) {
                                  setForm(p => ({ ...p, testimonials: [...p.testimonials, newTestimonial] }));
                                  setNewTestimonial({ name: "", text: "", rating: "5" });
                                  setShowAddTestimonial(false);
                                }
                              }}>Add Review</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddTestimonial(false)}>Cancel</Button>
                            </div>
                          </div>
                        )}

                        {form.testimonials.length > 0 && (
                          <div className="rounded-[12px] border border-[#e2e8f0] bg-white divide-y divide-[#e2e8f0]">
                            {form.testimonials.map((t, idx) => (
                              <div key={idx} className="p-4">
                                {editingTestimonialIdx === idx ? (
                                  <div className="grid gap-4 w-full">
                                    <div className="grid gap-4 sm:grid-cols-2">
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
                                      }}>Save Review</Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTestimonialIdx(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#0f172a]">{t.name} <span className="text-[#f59e0b] ml-1">({t.rating}★)</span></p>
                                      <p className="mt-1 text-[13px] text-[#64748b]">"{t.text}"</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditTestimonial(t); setEditingTestimonialIdx(idx); }}>
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, testimonials: p.testimonials.filter((_, i) => i !== idx) }))}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#e2e8f0]">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[14px] font-semibold text-[#1e293b]">Frequently Asked Questions</p>
                        {!showAddFaq && editingFaqIdx === null && (
                          <Button type="button" size="sm" variant="secondary" onClick={() => setShowAddFaq(true)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Add FAQ
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {showAddFaq && (
                          <div className="grid gap-4 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] p-4">
                            <Field label="Question" value={newFaq.question} onChange={e => setNewFaq(p => ({...p, question: e.target.value}))} placeholder="e.g. Is this course for beginners?" />
                            <TextAreaField label="Answer" value={newFaq.answer} onChange={e => setNewFaq(p => ({...p, answer: e.target.value}))} placeholder="e.g. Yes, we start from scratch..." />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" onClick={() => {
                                if (newFaq.question && newFaq.answer) {
                                  setForm(p => ({ ...p, faqs: [...p.faqs, newFaq] }));
                                  setNewFaq({ question: "", answer: "" });
                                  setShowAddFaq(false);
                                }
                              }}>Add FAQ</Button>
                              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddFaq(false)}>Cancel</Button>
                            </div>
                          </div>
                        )}

                        {form.faqs.length > 0 && (
                          <div className="rounded-[12px] border border-[#e2e8f0] bg-white divide-y divide-[#e2e8f0]">
                            {form.faqs.map((f, idx) => (
                              <div key={idx} className="p-4">
                                {editingFaqIdx === idx ? (
                                  <div className="grid gap-4 w-full">
                                    <Field label="Question" value={editFaq.question} onChange={e => setEditFaq(p => ({...p, question: e.target.value}))} />
                                    <TextAreaField label="Answer" value={editFaq.answer} onChange={e => setEditFaq(p => ({...p, answer: e.target.value}))} />
                                    <div className="flex gap-2">
                                      <Button type="button" size="sm" onClick={() => {
                                        const updated = [...form.faqs];
                                        updated[idx] = editFaq;
                                        setForm(p => ({ ...p, faqs: updated }));
                                        setEditingFaqIdx(null);
                                      }}>Save FAQ</Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFaqIdx(null)}>Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="text-[14px] font-semibold text-[#0f172a]">Q: {f.question}</p>
                                      <p className="mt-1 text-[13px] text-[#64748b]">A: {f.answer}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button type="button" className="p-1.5 text-[#64748b] hover:text-[#0f172a]" onClick={() => { setEditFaq(f); setEditingFaqIdx(idx); }}>
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button type="button" className="p-1.5 text-[#ef4444] hover:bg-[#fef2f2] rounded" onClick={() => setForm(p => ({ ...p, faqs: p.faqs.filter((_, i) => i !== idx) }))}>
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-[#e2e8f0] bg-[#f8fafc] px-8 py-4 flex items-center justify-between">
              <div className="flex-1">
                {error && <p className="text-[13px] font-medium text-[#dc2626]">{error}</p>}
                {successMsg && <p className="flex items-center gap-1 text-[13px] font-medium text-[#15803d]"><Check className="h-3.5 w-3.5" />{successMsg}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" loading={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
""")
