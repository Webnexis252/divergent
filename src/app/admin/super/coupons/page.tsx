"use client";

import { useEffect, useRef, useState } from "react";
import { m as motion, AnimatePresence } from "motion/react";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import { CircleCheck, CircleSlash, Pencil, Plus, Tag, TicketPercent, Users, X } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  IconChip,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminInputClass,
  adminLabelClass,
  adminPanelClass,
} from "../../_components/admin-ui";

type CourseOption = {
  id: string;
  title: string;
  price: number;
  category?: string | null;
};

type Coupon = {
  id: string;
  code: string;
  name: string | null;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  maxDiscount: number | null;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  startDate: string | null;
  validUntil: string | null;
  minPurchase: number | null;
  limitPerLearner: number;
  description: string | null;
  targetUsers: "ALL" | "FIRST_TIME" | "RENEWING";
  applicableCourseIds: string[];
  createdAt: string;
};

const EMPTY_FORM = {
  code: "",
  name: "",
  discountType: "FIXED" as "FIXED" | "PERCENTAGE",
  discountValue: "",
  maxDiscount: "",
  startDate: "",
  validUntil: "",
  maxUses: "",
  minPurchase: "",
  limitPerLearner: "",
  targetUsers: "ALL" as "ALL" | "FIRST_TIME" | "RENEWING",
  applicableCourseIds: [] as string[],
};

const inputCls = adminInputClass;

// ─── Course Multi‑Picker ────────────────────────────────────────────────────
function CoursePicker({
  allCourses,
  selected,
  onChange,
}: {
  allCourses: CourseOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = allCourses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]
    );

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-[12px] border border-[#e2e8f0] bg-white">
      {/* Search */}
      <div className="border-b border-[#eef1f5] bg-[#f8fafc] p-2">
        <input
          placeholder="Search courses to apply coupon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[8px] border border-[#e2e8f0] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#209bd2] focus:ring-2 focus:ring-[#38c1ff]/20"
        />
      </div>
      
      {/* Clear all */}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="w-full border-b border-[#eef1f5] px-4 py-2 text-left text-[12px] font-semibold text-[#0369a1] transition-colors hover:bg-[#f0f9ff]"
        >
          <X className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Clear selection (apply to all courses)
        </button>
      )}
      
      {/* List */}
      <ul className="max-h-52 divide-y divide-[#f1f5f9] overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-4 py-4 text-center text-[13px] text-[#94a3b8]">No courses found</li>
        ) : (
          filtered.map((c) => {
            const checked = selected.includes(c.id);
            return (
              <li key={c.id}>
                <label className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 transition ${checked ? "bg-[#f0f9ff]" : "hover:bg-[#f8fafc]"}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 rounded accent-[#209bd2]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#0f172a] truncate">{c.title}</p>
                    {c.category && (
                      <p className="text-[11px] text-[#94a3b8]">{c.category}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#334155]">
                    ₹{c.price.toLocaleString("en-IN")}
                  </span>
                </label>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

// ─── Coupon Form (shared by Create & Edit) ──────────────────────────────────
function CouponForm({
  title,
  form,
  setForm,
  allCourses,
  saving,
  error,
  onSubmit,
  onCancel,
  submitLabel,
  isEdit,
}: {
  title: string;
  form: typeof EMPTY_FORM;
  setForm: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  allCourses: CourseOption[];
  saving: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isEdit?: boolean;
}) {
  return (
    <section className={`${adminPanelClass} p-5 sm:p-6`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <IconChip icon={TicketPercent} tone="amber" />
          <div>
            <h2 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">{title}</h2>
            <p className="mt-1 text-[13px] text-[#64748b]">Codes are uppercase letters and numbers, up to 15 characters</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="rounded-full p-2 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Coupon Code */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-[#475569]">
                Coupon Code{!isEdit && "*"}
              </label>
              <span className="text-[12px] text-[#64748b]">{form.code.length}/15</span>
            </div>
            <input
              type="text"
              required={!isEdit}
              maxLength={15}
              placeholder="Ex: GET50"
              value={form.code}
              disabled={isEdit}
              onChange={(e) =>
                setForm((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))
              }
              className={`${inputCls} ${isEdit ? "opacity-60 cursor-not-allowed bg-[#f8fafc]" : ""}`}
            />
            {!isEdit && (
              <p className="mt-1 text-[11px] text-[#64748b] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Uppercase letters and numbers only
              </p>
            )}
          </div>

          {/* Coupon Name */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-[12px] font-semibold text-[#475569]">Coupon Name</label>
              <span className="text-[12px] text-[#64748b]">{form.name.length}/60</span>
            </div>
            <input
              type="text"
              maxLength={60}
              placeholder="Give name for your coupon code"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Discount Type */}
          <div>
            <label className="mb-2 block text-[12px] font-semibold text-[#475569]">Discount Type*</label>
            <div className="flex gap-4">
              {(["FIXED", "PERCENTAGE"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-[14px] text-[#334155] cursor-pointer">
                  <input
                    type="radio"
                    name={`discountType-${isEdit ? "edit" : "create"}`}
                    value={t}
                    checked={form.discountType === t}
                    onChange={() => setForm((p) => ({ ...p, discountType: t }))}
                    className="h-4 w-4 accent-[#209bd2]"
                  />
                  {t === "FIXED" ? "Fixed (₹)" : "Percentage (%)"}
                </label>
              ))}
            </div>
          </div>

          {/* Discount Value */}
          <div>
            <label className={adminLabelClass}>
              Discount Value*{" "}
              <span className="text-[#94a3b8]">
                ({form.discountType === "PERCENTAGE" ? "%" : "₹"})
              </span>
            </label>
            <input
              type="number"
              required
              placeholder={form.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 500"}
              value={form.discountValue}
              onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
              min={0}
              max={form.discountType === "PERCENTAGE" ? 100 : undefined}
              className={inputCls}
            />
          </div>

          {/* Max Discount Amount (Only for Percentage) */}
          <AnimatePresence>
            {form.discountType === "PERCENTAGE" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="col-span-1 sm:col-span-2"
              >
                <div className="w-full sm:w-1/2 sm:pr-2">
                  <label className={adminLabelClass}>
                    Max Discount Amount (₹)
                    <span className="ml-2 text-[11px] font-normal text-[#94a3b8]">
                      (leave empty for no limit)
                    </span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    value={form.maxDiscount}
                    onChange={(e) => setForm((p) => ({ ...p, maxDiscount: e.target.value }))}
                    min={0}
                    className={inputCls}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Target Audience */}
        <div>
          <label className="mb-2 block text-[12px] font-semibold text-[#475569]">Target Audience</label>
          <div className="flex flex-wrap gap-4">
            {(["ALL", "FIRST_TIME", "RENEWING"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-[14px] text-[#334155] cursor-pointer">
                <input
                  type="radio"
                  name={`targetUsers-${isEdit ? "edit" : "create"}`}
                  value={t}
                  checked={form.targetUsers === t}
                  onChange={() => setForm((p) => ({ ...p, targetUsers: t }))}
                  className="h-4 w-4 accent-[#209bd2]"
                />
                {t === "ALL" ? "All Users" : t === "FIRST_TIME" ? "First Time Users" : "Renewing Users"}
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Start Date */}
          <div>
            <label className={adminLabelClass}>Start Date</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className={inputCls}
            />
          </div>
          {/* Expiry Date */}
          <div>
            <label className={adminLabelClass}>Expiry Date</label>
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Max Uses */}
          <div>
            <label className={adminLabelClass}>Max Uses</label>
            <input
              type="number"
              placeholder="100"
              value={form.maxUses}
              onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
              min={1}
              className={inputCls}
            />
          </div>
          {/* Min Purchase */}
          <div>
            <label className={adminLabelClass}>Min Purchase (₹)</label>
            <input
              type="number"
              placeholder="0"
              value={form.minPurchase}
              onChange={(e) => setForm((p) => ({ ...p, minPurchase: e.target.value }))}
              min={0}
              className={inputCls}
            />
          </div>
          {/* Limit Per Learner */}
          <div>
            <label className={adminLabelClass}>Limit / Learner</label>
            <input
              type="number"
              placeholder="1"
              value={form.limitPerLearner}
              onChange={(e) => setForm((p) => ({ ...p, limitPerLearner: e.target.value }))}
              min={1}
              className={inputCls}
            />
          </div>
        </div>

        {/* Applicable Courses */}
        <div>
          <label className={adminLabelClass}>
            Applicable Courses
            <span className="ml-2 text-[11px] font-normal text-[#94a3b8]">
              (leave empty = valid for ALL courses)
            </span>
          </label>
          <CoursePicker
            allCourses={allCourses}
            selected={form.applicableCourseIds}
            onChange={(ids) => setForm((p) => ({ ...p, applicableCourseIds: ids }))}
          />
          {form.applicableCourseIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.applicableCourseIds.map((id) => {
                const c = allCourses.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-[#bae6fd] bg-[#f0f9ff] px-2.5 py-1 text-[11px] font-semibold text-[#0369a1]">
                    {c?.title ?? id}
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, applicableCourseIds: p.applicableCourseIds.filter((x) => x !== id) }))}
                      className="hover:text-[#0c4a6e]"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-[13px] text-[#dc2626]">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={saving}
            className={adminButton.primary}
          >
            {saving ? "Saving…" : submitLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={adminButton.secondary}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [allCourses, setAllCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editForm, setEditForm] = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/super-admin/coupons").then((r) => r.json()),
      fetch("/api/super-admin/coupons?courses=1").then((r) => r.json()),
    ]).then(([couponsRes, coursesRes]) => {
      if (couponsRes.success) setCoupons(couponsRes.data);
      if (coursesRes.success) setAllCourses(coursesRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Create ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateSaving(true);
    setCreateError("");
    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: createForm.code.toUpperCase(),
          name: createForm.name || undefined,
          discountType: createForm.discountType,
          discountValue: parseFloat(createForm.discountValue),
          maxDiscount: createForm.discountType === "PERCENTAGE" && createForm.maxDiscount ? parseFloat(createForm.maxDiscount) : null,
          maxUses: createForm.maxUses ? parseInt(createForm.maxUses) : undefined,
          startDate: createForm.startDate || undefined,
          validUntil: createForm.validUntil || undefined,
          minPurchase: createForm.minPurchase ? parseFloat(createForm.minPurchase) : undefined,
          limitPerLearner: createForm.limitPerLearner ? parseInt(createForm.limitPerLearner) : undefined,
          targetUsers: createForm.targetUsers,
          applicableCourseIds: createForm.applicableCourseIds,
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setCreateError(p.error ?? "Failed to create"); return; }
      setCoupons((prev) => [p.data, ...prev]);
      setCreateForm({ ...EMPTY_FORM });
      setShowCreate(false);
    } catch { setCreateError("Network error"); }
    finally { setCreateSaving(false); }
  }

  // ── Open Edit ──
  function openEdit(coupon: Coupon) {
    setEditingCoupon(coupon);
    setEditError("");
    setEditForm({
      code: coupon.code,
      name: coupon.name ?? "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      maxDiscount: coupon.maxDiscount != null ? String(coupon.maxDiscount) : "",
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : "",
      validUntil: coupon.validUntil ? coupon.validUntil.slice(0, 10) : "",
      maxUses: String(coupon.maxUses),
      minPurchase: coupon.minPurchase != null ? String(coupon.minPurchase) : "",
      limitPerLearner: String(coupon.limitPerLearner),
      targetUsers: coupon.targetUsers,
      applicableCourseIds: coupon.applicableCourseIds ?? [],
    });
    // Scroll create form closed
    setShowCreate(false);
  }

  // ── Save Edit ──
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCoupon) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCoupon.id,
          name: editForm.name || null,
          discountType: editForm.discountType,
          discountValue: parseFloat(editForm.discountValue),
          maxDiscount: editForm.discountType === "PERCENTAGE" && editForm.maxDiscount ? parseFloat(editForm.maxDiscount) : null,
          maxUses: editForm.maxUses ? parseInt(editForm.maxUses) : 100,
          startDate: editForm.startDate || null,
          validUntil: editForm.validUntil || null,
          minPurchase: editForm.minPurchase ? parseFloat(editForm.minPurchase) : null,
          limitPerLearner: editForm.limitPerLearner ? parseInt(editForm.limitPerLearner) : 1,
          targetUsers: editForm.targetUsers,
          applicableCourseIds: editForm.applicableCourseIds,
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setEditError(p.error ?? "Failed to save"); return; }
      setCoupons((prev) => prev.map((c) => (c.id === editingCoupon.id ? p.data : c)));
      setEditingCoupon(null);
    } catch { setEditError("Network error"); }
    finally { setEditSaving(false); }
  }

  // ── Toggle Active ──
  async function toggleCoupon(coupon: Coupon) {
    setToggling(coupon.id);
    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      });
      const p = await res.json();
      if (p.success) setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? p.data : c)));
    } catch { /* silent */ }
    finally { setToggling(null); }
  }

  const active = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((a, c) => a + c.usedCount, 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Owner controls"
            icon={TicketPercent}
            title="Coupons & discounts"
            description="Promotional codes with course-level targeting and usage limits."
            actions={
              <button
                type="button"
                onClick={() => { setShowCreate((v) => !v); setEditingCoupon(null); }}
                className={showCreate ? adminButton.secondary : adminButton.primary}
              >
                {showCreate ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {showCreate ? "Cancel" : "New coupon"}
              </button>
            }
          />
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminStatCard index={0} title="Total codes" value={loading ? "…" : coupons.length} caption="All coupons created." icon={<Tag />} tone="amber" />
          <AdminStatCard index={1} title="Active" value={loading ? "…" : active} caption="Currently redeemable." icon={<CircleCheck />} tone="emerald" />
          <AdminStatCard index={2} title="Total uses" value={loading ? "…" : totalUses} caption="Redemptions across all codes." icon={<Users />} tone="sky" />
        </StaggerGrid>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              key="create-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <CouponForm
                title="Create coupon"
                form={createForm}
                setForm={setCreateForm}
                allCourses={allCourses}
                saving={createSaving}
                error={createError}
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                submitLabel="Create coupon"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Form */}
        <AnimatePresence>
          {editingCoupon && (
            <motion.div
              key={`edit-${editingCoupon.id}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden" }}
            >
              <div>
                <CouponForm
                  title={`Edit ${editingCoupon.code}`}
                  isEdit
                  form={editForm}
                  setForm={setEditForm}
                  allCourses={allCourses}
                  saving={editSaving}
                  error={editError}
                  onSubmit={handleEdit}
                  onCancel={() => setEditingCoupon(null)}
                  submitLabel="Save changes"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon Grid */}
        <RevealSection>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-[24px] bg-white/70" />
              ))
            ) : coupons.length === 0 ? (
              <div className={`${adminPanelClass} p-5 md:col-span-2 xl:col-span-3`}>
                <AdminEmptyState icon={TicketPercent} title="No coupons yet" description="Create your first one with New coupon." />
              </div>
            ) : (
              coupons.map((coupon, i) => {
                const usagePct = Math.min((coupon.usedCount / coupon.maxUses) * 100, 100);
                const isEditing = editingCoupon?.id === coupon.id;
                const courseNames = (coupon.applicableCourseIds ?? [])
                  .map((id) => allCourses.find((c) => c.id === id)?.title ?? id)
                  .filter(Boolean);

                return (
                  <motion.article
                    key={coupon.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    whileHover={{ y: -3 }}
                    className={`relative flex flex-col overflow-hidden rounded-[20px] border bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] ${
                      isEditing ? "border-[#209bd2] ring-3 ring-[#38c1ff]/20" : "border-[#e8edf3]"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-flex rounded-[8px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-2.5 py-1 font-mono text-[18px] font-bold tracking-[0.1em] text-[#0f172a]">
                          {coupon.code}
                        </span>
                        <p className="mt-3 text-[22px] font-semibold leading-none tracking-[-0.02em] text-[#0f172a]">
                          {coupon.discountType === "PERCENTAGE"
                            ? `${coupon.discountValue}% off`
                            : `₹${coupon.discountValue} off`}
                        </p>
                        {coupon.targetUsers !== "ALL" && (
                          <StatusBadge tone="violet" className="mt-2">
                            {coupon.targetUsers === "FIRST_TIME" ? "First-time buyers" : "Renewals only"}
                          </StatusBadge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleCoupon(coupon)}
                          disabled={toggling === coupon.id}
                          title={coupon.isActive ? "Click to disable" : "Click to enable"}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                            coupon.isActive
                              ? "bg-[#ecfdf3] text-[#15803d] hover:bg-[#dcfce7]"
                              : "bg-[#f1f5f9] text-[#475569] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          {coupon.isActive ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleSlash className="h-3.5 w-3.5" aria-hidden="true" />}
                          {toggling === coupon.id ? "…" : coupon.isActive ? "Active" : "Disabled"}
                        </button>
                        <button
                          type="button"
                          onClick={() => isEditing ? setEditingCoupon(null) : openEdit(coupon)}
                          className={isEditing ? adminButtonSm.primary : adminButtonSm.secondary}
                        >
                          {isEditing ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Pencil className="h-3.5 w-3.5" aria-hidden="true" />}
                          {isEditing ? "Close" : "Edit"}
                        </button>
                      </div>
                    </div>

                    {/* Usage bar */}
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-[12px] text-[#64748b]">
                        <span>Usage</span>
                        <span className="font-semibold tabular-nums text-[#334155]">{coupon.usedCount} / {coupon.maxUses}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e0f2fe]">
                        <motion.div
                          className={`h-full rounded-full ${usagePct >= 90 ? "bg-[#ef4444]" : usagePct >= 70 ? "bg-[#f59e0b]" : "bg-[#209bd2]"}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${usagePct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-3 space-y-1">
                      {coupon.validUntil && (
                        <p className="text-[12px] text-[#94a3b8]">
                          Expires {formatShortDate(coupon.validUntil)}
                        </p>
                      )}
                      {coupon.minPurchase != null && coupon.minPurchase > 0 && (
                        <p className="text-[12px] text-[#94a3b8]">
                          Min purchase: ₹{coupon.minPurchase.toLocaleString("en-IN")}
                        </p>
                      )}
                      {coupon.name && (
                        <p className="text-[13px] text-[#64748b]">{coupon.name}</p>
                      )}
                    </div>

                    {/* Applicable Courses */}
                    {courseNames.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#f1f5f9]">
                        <p className="mb-1.5 text-[11px] font-medium text-[#94a3b8]">Valid for</p>
                        <div className="flex flex-wrap gap-1.5">
                          {courseNames.slice(0, 3).map((name, idx) => (
                            <span key={idx} className="inline-flex max-w-full truncate rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                              {name}
                            </span>
                          ))}
                          {courseNames.length > 3 && (
                            <span className="inline-flex rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-semibold text-[#475569]">
                              +{courseNames.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {courseNames.length === 0 && (
                      <p className="mt-3 border-t border-[#f1f5f9] pt-3 text-[11px] text-[#94a3b8]">Valid for all courses</p>
                    )}
                  </motion.article>
                );
              })
            )}
          </div>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
