"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "@/app/admin/_components/AdminStatCard";
import PricingPlanBuilder from "@/app/admin/_components/PricingPlanBuilder";
import {
  Package,
  Pencil,
  Trash2,
  X,
  CheckCircle,
  EyeOff,
  Eye,
  ChevronDown,
  ImagePlus,
} from "lucide-react";

type Course = {
  id: string;
  title: string;
  price: number;
  thumbnail?: string | null;
};
type BundleCourse = { id: string; course: Course };
type Bundle = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  thumbnail?: string | null;
  price: number;
  isPublished: boolean;
  createdAt: string;
  courses: (BundleCourse & { teachers?: { id: string; name: string }[] })[];
  _count: { payments: number };
  isInstallmentBased: boolean;
  emiPlans: Array<{ label: string; amount: number; dueDays: number }> | null;
  visibility?: "PUBLIC" | "UNLISTED";
};

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBundle, setEditBundle] = useState<Bundle | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<
    Record<string, string[]>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT" | "UNLISTED">("DRAFT");
  const [isInstallmentBased, setIsInstallmentBased] = useState(false);
  const [emiPlans, setEmiPlans] = useState<any[]>([]);
  const [showAddInstalment, setShowAddInstalment] = useState(false);
  const [newInstalment, setNewInstalment] = useState({
    label: "",
    amount: "",
    dueDays: "",
  });
  const [editingInstalmentIdx, setEditingInstalmentIdx] = useState<
    number | null
  >(null);
  const [editInstalment, setEditInstalment] = useState({
    label: "",
    amount: "",
    dueDays: "",
  });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [thumbnail, setThumbnail] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/bundles").then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
      fetch("/api/admin/mentors").then((r) => r.json()),
    ])
      .then(([bundlesRes, coursesRes, mentorsRes]) => {
        if (bundlesRes.success) setBundles(bundlesRes.data);
        if (coursesRes.success) setAllCourses(coursesRes.data);
        if (mentorsRes.success) {
          const active = mentorsRes.data.active || [];
          active.sort((a: any, b: any) =>
            (a.name || "").localeCompare(b.name || ""),
          );
          setAllTeachers(active);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateForm = () => {
    setEditBundle(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setSelectedCourseIds([]);
    setTeacherAssignments({});
    setStatus("DRAFT");
    setIsInstallmentBased(false);
    setEmiPlans([]);
    setShowAddInstalment(false);
    setThumbnail("");
    setShowForm(true);
  };

  const openEditForm = (bundle: Bundle) => {
    setEditBundle(bundle);
    setTitle(bundle.title);
    setDescription(bundle.description ?? "");
    setPrice(String(bundle.price));
    setSelectedCourseIds(bundle.courses.map((bc) => bc.course.id));
    const assignments: Record<string, string[]> = {};
    bundle.courses.forEach((bc) => {
      if (bc.teachers && bc.teachers.length > 0) {
        assignments[bc.course.id] = bc.teachers.map((t) => t.id);
      }
    });
    setTeacherAssignments(assignments);
    setStatus(bundle.isPublished ? (bundle.visibility === "UNLISTED" ? "UNLISTED" : "PUBLISHED") : "DRAFT");
    setIsInstallmentBased(bundle.isInstallmentBased || false);
    setEmiPlans(
      Array.isArray(bundle.emiPlans)
        ? (bundle.emiPlans as any[])[0]?.installments
          ? (bundle.emiPlans as any[]).map((p: any) => ({
              id: p.id || crypto.randomUUID(),
              name: p.name || "Custom Instalment Plan",
              installments: p.installments.map((i: any) => ({
                label: i.label || "",
                amount: String(i.amount || 0),
                dueDays: String(i.dueDays || 0),
              })),
            }))
          : [
              {
                id: "legacy",
                name: "Default Installment Plan",
                installments: (bundle.emiPlans as any[]).map((p: any) => ({
                  label: p.label || "",
                  amount: String(p.amount || 0),
                  dueDays: String(p.dueDays || 0),
                })),
              },
            ]
        : [],
    );
    setShowAddInstalment(false);
    setThumbnail(bundle.thumbnail || "");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditBundle(null);
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setThumbnail(data.data.url);
        showToast("Image uploaded successfully");
      } else {
        showToast("Upload failed", false);
      }
    } catch {
      showToast("Upload failed", false);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) return showToast("Bundle title is required", false);
    if (selectedCourseIds.length < 2)
      return showToast("Select at least 2 courses", false);
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0)
      return showToast("Enter a valid price", false);

    setSubmitting(true);
    try {
      const url = editBundle
        ? `/api/admin/bundles/${editBundle.id}`
        : "/api/admin/bundles";
      const method = editBundle ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          thumbnail,
          price: numPrice,
          isPublished: status === "PUBLISHED" || status === "UNLISTED",
          visibility: status === "UNLISTED" ? "UNLISTED" : "PUBLIC",
          isInstallmentBased,
          emiPlans:
            emiPlans.length > 0
              ? emiPlans.map((plan) => ({
                  id: plan.id,
                  name: plan.name,
                  installments: plan.installments.map((p: any) => ({
                    label: p.label,
                    amount: Number(p.amount) || 0,
                    dueDays: Number(p.dueDays) || 0,
                  })),
                }))
              : null,
          courses: selectedCourseIds.map((id) => ({
            courseId: id,
            teacherIds: teacherAssignments[id] || [],
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error ?? "Failed to save bundle", false);
      } else {
        showToast(editBundle ? "Bundle updated!" : "Bundle created!");
        closeForm();
        load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bundle?")) return;
    const res = await fetch(`/api/admin/bundles/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      showToast("Bundle deleted");
      setBundles((prev) => prev.filter((b) => b.id !== id));
    } else {
      showToast(data.error ?? "Failed to delete", false);
    }
  };

  const handleTogglePublish = async (bundle: Bundle) => {
    const newIsPublished = !bundle.isPublished;
    const newStatus = newIsPublished ? "PUBLISHED" : "DRAFT";
    const res = await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: newIsPublished, visibility: "PUBLIC" }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(
        bundle.isPublished ? "Bundle unpublished" : "Bundle published!",
      );
      load();
    }
  };

  const totalRevenue = bundles.reduce(
    (sum, b) => sum + b._count.payments * b.price,
    0,
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#7c3aed] via-[#9333ea] to-[#38c1ff] px-8 py-10 text-white shadow-[0_24px_60px_rgba(124,58,237,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
                  <Package className="h-4 w-4" /> Course Bundles
                </div>
                <h1 className="mt-4 text-4xl font-bold tracking-tight">
                  Bundles
                </h1>
                <p className="mt-2 text-white/80">
                  Group multiple courses into a bundle and sell them together at
                  a special price.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                onClick={showForm ? closeForm : openCreateForm}
                className="rounded-[14px] bg-white/20 px-5 py-2.5 font-semibold backdrop-blur-sm hover:bg-white/30 transition"
              >
                {showForm ? "✕ Cancel" : "+ New Bundle"}
              </motion.button>
            </div>
          </div>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <AdminStatCard
            index={0}
            title="Total Bundles"
            value={loading ? "…" : bundles.length}
            caption="All bundles created."
            tone="sky"
          />
          <AdminStatCard
            index={1}
            title="Published"
            value={loading ? "…" : bundles.filter((b) => b.isPublished).length}
            caption="Visible to students."
            tone="emerald"
          />
          <AdminStatCard
            index={2}
            title="Est. Revenue"
            value={loading ? "…" : `₹${totalRevenue.toLocaleString("en-IN")}`}
            caption="From bundle purchases."
            tone="amber"
          />
        </StaggerGrid>

        {/* Create / Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-[24px] bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-[#101828]">
                  {editBundle ? "Edit Bundle" : "Create New Bundle"}
                </h2>
                <button
                  onClick={closeForm}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Bundle Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Complete JEE Prep Bundle"
                      className="w-full rounded-[12px] border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Bundle Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. 4999"
                      className="w-full rounded-[12px] border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what students get in this bundle..."
                    rows={2}
                    className="w-full rounded-[12px] border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed] resize-none"
                  />
                </div>

                {/* Bundle Thumbnail Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Thumbnail Image
                  </label>
                  <div className="flex items-start gap-4">
                    {thumbnail ? (
                      <div className="relative h-[90px] w-[160px] flex-shrink-0 overflow-hidden rounded-[12px] border border-gray-200 shadow-sm">
                        <img
                          src={thumbnail}
                          alt="Thumbnail"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setThumbnail("")}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                    <div className="flex-1">
                      <label
                        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed px-4 py-6 transition ${thumbnail ? "border-gray-200 hover:bg-gray-50 text-gray-500" : "border-[#7c3aed]/40 bg-[#7c3aed]/5 text-[#7c3aed] hover:bg-[#7c3aed]/10"}`}
                      >
                        {uploadingImage ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <ImagePlus className="h-5 w-5" />
                        )}
                        <span className="text-sm font-semibold">
                          {uploadingImage
                            ? "Uploading..."
                            : "Upload from device"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-3 mt-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status & Visibility
                  </label>
                  <div className="grid gap-3">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition ${status === "PUBLISHED" ? "border-[#38c1ff] bg-[#f0f9ff]" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="status" checked={status === "PUBLISHED"} onChange={() => setStatus("PUBLISHED")} className="mt-0.5 h-4 w-4 accent-[#38c1ff]" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Published</div>
                        <div className="text-sm text-gray-500 mt-0.5">Visible to all students in the catalog.</div>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition ${status === "UNLISTED" ? "border-[#38c1ff] bg-[#f0f9ff]" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="status" checked={status === "UNLISTED"} onChange={() => setStatus("UNLISTED")} className="mt-0.5 h-4 w-4 accent-[#38c1ff]" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Unlisted</div>
                        <div className="text-sm text-gray-500 mt-0.5">Hidden from students. Can be added to Bundles.</div>
                      </div>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-[12px] border p-4 transition ${status === "DRAFT" ? "border-[#38c1ff] bg-[#f0f9ff]" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="status" checked={status === "DRAFT"} onChange={() => setStatus("DRAFT")} className="mt-0.5 h-4 w-4 accent-[#38c1ff]" />
                      <div>
                        <div className="text-sm font-semibold text-gray-900">Draft / Unpublished</div>
                        <div className="text-sm text-gray-500 mt-0.5">Hidden everywhere. Saved for later.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Course multi-select */}
                <div className="space-y-2 mt-4 border-t pt-4">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Select Courses ({selectedCourseIds.length} selected —
                    minimum 2)
                  </label>
                  <div className="relative">
                    <div
                      className="flex w-full cursor-pointer items-center justify-between rounded-[12px] border border-gray-200 bg-white px-4 py-2.5 text-sm transition hover:border-[#7c3aed]"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <span
                        className={
                          selectedCourseIds.length > 0
                            ? "font-medium text-[#101828]"
                            : "text-gray-400"
                        }
                      >
                        {selectedCourseIds.length > 0
                          ? `${selectedCourseIds.length} course${selectedCourseIds.length > 1 ? "s" : ""} selected`
                          : "Click to select courses..."}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      />
                    </div>

                    <AnimatePresence>
                      {dropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 mt-2 max-h-60 w-full space-y-1 overflow-y-auto rounded-[14px] border border-gray-200 bg-white p-2 shadow-xl"
                        >
                          {allCourses.map((course) => {
                            const selected = selectedCourseIds.includes(
                              course.id,
                            );
                            return (
                              <label
                                key={course.id}
                                className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition ${
                                  selected
                                    ? "bg-purple-50 border border-purple-200"
                                    : "border border-transparent hover:bg-gray-50"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleCourse(course.id)}
                                  className="h-4 w-4 rounded accent-[#7c3aed]"
                                />
                                <span className="flex-1 text-sm font-medium text-[#101828]">
                                  {course.title}
                                </span>
                                <span className="text-xs text-gray-400">
                                  ₹{course.price.toLocaleString("en-IN")}
                                </span>
                              </label>
                            );
                          })}
                          {allCourses.length === 0 && (
                            <p className="py-4 text-center text-sm text-gray-400">
                              No courses found.
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {selectedCourseIds.length >= 2 && (
                    <p className="text-xs text-emerald-600">
                      Total individual price: ₹
                      {allCourses
                        .filter((c) => selectedCourseIds.includes(c.id))
                        .reduce((s, c) => s + c.price, 0)
                        .toLocaleString("en-IN")}
                      {price && parseFloat(price) > 0 && (
                        <span className="ml-2 font-semibold text-purple-600">
                          → Bundle saves ₹
                          {Math.max(
                            0,
                            allCourses
                              .filter((c) => selectedCourseIds.includes(c.id))
                              .reduce((s, c) => s + c.price, 0) -
                              parseFloat(price),
                          ).toLocaleString("en-IN")}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Course Teacher Assignments */}
                {selectedCourseIds.length > 0 && (
                  <div className="space-y-3 mt-4 border-t pt-4">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Teacher Assignments
                    </label>
                    {selectedCourseIds.map((courseId) => {
                      const course = allCourses.find((c) => c.id === courseId);
                      if (!course) return null;
                      const assignedIds = teacherAssignments[courseId] || [];
                      // Note: we consider an override active if the key exists in teacherAssignments
                      // It could be an empty array if they selected override but chose no one (or cleared it).
                      // To keep it simple, if it's undefined, it's "original", otherwise "new".
                      const hasOverride =
                        typeof teacherAssignments[courseId] !== "undefined";

                      return (
                        <div
                          key={courseId}
                          className="rounded-xl border border-gray-200 p-4 bg-gray-50/50 space-y-3"
                        >
                          <p className="text-sm font-semibold text-[#101828]">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-6 text-[13px] text-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer hover:text-purple-600 transition">
                              <input
                                type="radio"
                                name={`override-${courseId}`}
                                className="accent-[#7c3aed]"
                                checked={!hasOverride}
                                onChange={() => {
                                  setTeacherAssignments((prev) => {
                                    const next = { ...prev };
                                    delete next[courseId];
                                    return next;
                                  });
                                }}
                              />
                              Use Original Teachers
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer hover:text-purple-600 transition">
                              <input
                                type="radio"
                                name={`override-${courseId}`}
                                className="accent-[#7c3aed]"
                                checked={hasOverride}
                                onChange={() => {
                                  setTeacherAssignments((prev) => ({
                                    ...prev,
                                    [courseId]: prev[courseId] || [],
                                  }));
                                }}
                              />
                              Assign New Teachers
                            </label>
                          </div>
                          {hasOverride && (
                            <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                              <div className="w-full max-h-[160px] overflow-y-auto rounded-[10px] border border-gray-300 bg-white p-2 text-[13px] text-gray-700 outline-none space-y-1">
                                {allTeachers.map((t) => {
                                  const isSelected = assignedIds.includes(t.id);
                                  return (
                                    <label
                                      key={t.id}
                                      className={`flex cursor-pointer items-center gap-2.5 rounded-[6px] px-2 py-1.5 transition ${
                                        isSelected
                                          ? "bg-purple-50 text-purple-800"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          setTeacherAssignments((prev) => {
                                            const current = prev[courseId] || [];
                                            const next = e.target.checked
                                              ? [...current, t.id]
                                              : current.filter((id) => id !== t.id);
                                            return { ...prev, [courseId]: next };
                                          });
                                        }}
                                        className="h-3.5 w-3.5 rounded accent-[#7c3aed] cursor-pointer"
                                      />
                                      <span>
                                        {t.name} <span className="text-gray-500">({t.email})</span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* EMI Plans Setup */}
                <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        Enable Installments
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Allow students to pay for this bundle in multiple parts
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isInstallmentBased}
                      onClick={() => setIsInstallmentBased(!isInstallmentBased)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:ring-offset-2 ${isInstallmentBased ? "bg-[#7c3aed]" : "bg-gray-200"}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isInstallmentBased ? "translate-x-5" : "translate-x-0"}`}
                      />
                    </button>
                  </div>

                  {isInstallmentBased && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <PricingPlanBuilder
                        plans={emiPlans}
                        onChange={setEmiPlans}
                      />
                    </div>
                  )}
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full rounded-[12px] bg-[#7c3aed] py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-[#6d28d9] transition"
                >
                  {submitting
                    ? "Saving…"
                    : editBundle
                      ? "Update Bundle"
                      : "Create Bundle"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bundles List */}
        <div className="rounded-[28px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="border-b px-6 py-5">
            <h2 className="text-[18px] font-bold text-[#101828]">
              All Bundles
            </h2>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-[16px] bg-gray-100"
                />
              ))
            ) : bundles.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-200" />
                <p className="mt-4 text-[16px] font-semibold text-gray-400">
                  No bundles yet
                </p>
                <p className="mt-1 text-[13px] text-gray-300">
                  Create your first course bundle to get started.
                </p>
              </div>
            ) : (
              bundles.map((bundle, i) => (
                <motion.div
                  key={bundle.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-[18px] border border-[#f1f5f9] bg-[#fafbff] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-purple-100">
                        <Package className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[#101828]">
                            {bundle.title}
                          </p>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bundle.isPublished ? (bundle.visibility === "UNLISTED" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700") : "bg-gray-100 text-gray-500"}`}
                          >
                            {bundle.isPublished ? (bundle.visibility === "UNLISTED" ? "Unlisted" : "Published") : "Draft"}
                          </span>
                        </div>
                        {bundle.description && (
                          <p className="mt-0.5 text-[13px] text-gray-500 truncate max-w-md">
                            {bundle.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {bundle.courses.map((bc) => (
                            <span
                              key={bc.id}
                              className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700"
                            >
                              {bc.course.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right mr-2">
                        <p className="text-[20px] font-bold text-[#7c3aed]">
                          ₹{bundle.price.toLocaleString("en-IN")}
                        </p>
                        <p className="text-[12px] text-gray-400">
                          {bundle._count.payments} sold
                        </p>
                      </div>
                      <button
                        onClick={() => handleTogglePublish(bundle)}
                        title={bundle.isPublished ? "Unpublish" : "Publish"}
                        className={`rounded-[10px] p-2 transition ${bundle.isPublished ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                      >
                        {bundle.isPublished ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditForm(bundle)}
                        className="rounded-[10px] bg-blue-50 p-2 text-blue-600 hover:bg-blue-100 transition"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(bundle.id)}
                        className="rounded-[10px] bg-red-50 p-2 text-red-500 hover:bg-red-100 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-[14px] px-5 py-3.5 text-sm font-semibold text-white shadow-xl ${
              toast.ok ? "bg-[#7c3aed]" : "bg-red-500"
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
