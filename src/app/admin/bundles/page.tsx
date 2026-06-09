"use client";


import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "@/app/admin/_components/AdminStatCard";
import { Package, Pencil, Trash2, X, CheckCircle, EyeOff, Eye, ChevronDown } from "lucide-react";

type Course = { id: string; title: string; price: number; thumbnail?: string | null };
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
  courses: BundleCourse[];
  _count: { payments: number };
};

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBundle, setEditBundle] = useState<Bundle | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/bundles").then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
    ])
      .then(([bundlesRes, coursesRes]) => {
        if (bundlesRes.success) setBundles(bundlesRes.data);
        if (coursesRes.success) setAllCourses(coursesRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreateForm = () => {
    setEditBundle(null);
    setTitle("");
    setDescription("");
    setPrice("");
    setSelectedCourseIds([]);
    setShowForm(true);
  };

  const openEditForm = (bundle: Bundle) => {
    setEditBundle(bundle);
    setTitle(bundle.title);
    setDescription(bundle.description ?? "");
    setPrice(String(bundle.price));
    setSelectedCourseIds(bundle.courses.map((bc) => bc.course.id));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditBundle(null);
  };

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return showToast("Bundle title is required", false);
    if (selectedCourseIds.length < 2) return showToast("Select at least 2 courses", false);
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) return showToast("Enter a valid price", false);

    setSubmitting(true);
    try {
      const url = editBundle ? `/api/admin/bundles/${editBundle.id}` : "/api/admin/bundles";
      const method = editBundle ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, price: numPrice, courseIds: selectedCourseIds }),
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
    const res = await fetch(`/api/admin/bundles/${bundle.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !bundle.isPublished }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(bundle.isPublished ? "Bundle unpublished" : "Bundle published!");
      load();
    }
  };

  const totalRevenue = bundles.reduce((sum, b) => sum + b._count.payments * b.price, 0);

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
                    <h1 className="mt-4 text-4xl font-bold tracking-tight">Bundles</h1>
                    <p className="mt-2 text-white/80">
                      Group multiple courses into a bundle and sell them together at a special price.
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
              <AdminStatCard index={0} title="Total Bundles" value={loading ? "…" : bundles.length} caption="All bundles created." tone="sky" />
              <AdminStatCard index={1} title="Published" value={loading ? "…" : bundles.filter((b) => b.isPublished).length} caption="Visible to students." tone="emerald" />
              <AdminStatCard index={2} title="Est. Revenue" value={loading ? "…" : `₹${totalRevenue.toLocaleString("en-IN")}`} caption="From bundle purchases." tone="amber" />
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
                    <button onClick={closeForm} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bundle Title</label>
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Complete JEE Prep Bundle"
                          className="w-full rounded-[12px] border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Bundle Price (₹)</label>
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
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Description (Optional)</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what students get in this bundle..."
                        rows={2}
                        className="w-full rounded-[12px] border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed] resize-none"
                      />
                    </div>

                    {/* Course multi-select */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Select Courses ({selectedCourseIds.length} selected — minimum 2)
                      </label>
                      <div className="relative">
                        <div 
                          className="flex w-full cursor-pointer items-center justify-between rounded-[12px] border border-gray-200 bg-white px-4 py-2.5 text-sm transition hover:border-[#7c3aed]"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                        >
                          <span className={selectedCourseIds.length > 0 ? "font-medium text-[#101828]" : "text-gray-400"}>
                            {selectedCourseIds.length > 0 
                              ? `${selectedCourseIds.length} course${selectedCourseIds.length > 1 ? 's' : ''} selected` 
                              : "Click to select courses..."}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
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
                                const selected = selectedCourseIds.includes(course.id);
                                return (
                                  <label
                                    key={course.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition ${
                                      selected ? "bg-purple-50 border border-purple-200" : "border border-transparent hover:bg-gray-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() => toggleCourse(course.id)}
                                      className="h-4 w-4 rounded accent-[#7c3aed]"
                                    />
                                    <span className="flex-1 text-sm font-medium text-[#101828]">{course.title}</span>
                                    <span className="text-xs text-gray-400">₹{course.price.toLocaleString("en-IN")}</span>
                                  </label>
                                );
                              })}
                              {allCourses.length === 0 && (
                                <p className="py-4 text-center text-sm text-gray-400">No courses found.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      {selectedCourseIds.length >= 2 && (
                        <p className="text-xs text-emerald-600">
                          Total individual price: ₹{allCourses.filter(c => selectedCourseIds.includes(c.id)).reduce((s, c) => s + c.price, 0).toLocaleString("en-IN")}
                          {price && parseFloat(price) > 0 && (
                            <span className="ml-2 font-semibold text-purple-600">
                              → Bundle saves ₹{Math.max(0, allCourses.filter(c => selectedCourseIds.includes(c.id)).reduce((s, c) => s + c.price, 0) - parseFloat(price)).toLocaleString("en-IN")}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full rounded-[12px] bg-[#7c3aed] py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-[#6d28d9] transition"
                    >
                      {submitting ? "Saving…" : editBundle ? "Update Bundle" : "Create Bundle"}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bundles List */}
            <div className="rounded-[28px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
              <div className="border-b px-6 py-5">
                <h2 className="text-[18px] font-bold text-[#101828]">All Bundles</h2>
              </div>
              <div className="p-6 space-y-4">
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-[16px] bg-gray-100" />
                  ))
                ) : bundles.length === 0 ? (
                  <div className="py-16 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-200" />
                    <p className="mt-4 text-[16px] font-semibold text-gray-400">No bundles yet</p>
                    <p className="mt-1 text-[13px] text-gray-300">Create your first course bundle to get started.</p>
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
                              <p className="font-bold text-[#101828]">{bundle.title}</p>
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bundle.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                {bundle.isPublished ? "Published" : "Draft"}
                              </span>
                            </div>
                            {bundle.description && (
                              <p className="mt-0.5 text-[13px] text-gray-500 truncate max-w-md">{bundle.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {bundle.courses.map((bc) => (
                                <span key={bc.id} className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                                  {bc.course.title}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right mr-2">
                            <p className="text-[20px] font-bold text-[#7c3aed]">₹{bundle.price.toLocaleString("en-IN")}</p>
                            <p className="text-[12px] text-gray-400">{bundle._count.payments} sold</p>
                          </div>
                          <button
                            onClick={() => handleTogglePublish(bundle)}
                            title={bundle.isPublished ? "Unpublish" : "Publish"}
                            className={`rounded-[10px] p-2 transition ${bundle.isPublished ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                          >
                            {bundle.isPublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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
