"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

type Coupon = {
  id: string;
  code: string;
  name: string | null;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  startDate: string | null;
  validUntil: string | null;
  minPurchase: number | null;
  limitPerLearner: number;
  description: string | null;
  createdAt: string;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    discountType: "FIXED" as "FIXED" | "PERCENTAGE",
    discountValue: "",
    startDate: "",
    validUntil: "",
    maxUses: "",
    minPurchase: "",
    limitPerLearner: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/super-admin/coupons")
      .then((r) => r.json())
      .then((p) => { if (p.success) setCoupons(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.toUpperCase(),
          name: form.name || undefined,
          discountType: form.discountType,
          discountValue: parseFloat(form.discountValue),
          maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
          startDate: form.startDate || undefined,
          validUntil: form.validUntil || undefined,
          minPurchase: form.minPurchase ? parseFloat(form.minPurchase) : undefined,
          limitPerLearner: form.limitPerLearner ? parseInt(form.limitPerLearner) : undefined,
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create"); return; }
      setCoupons((prev) => [p.data, ...prev]);
      setForm({
        code: "",
        name: "",
        discountType: "FIXED",
        discountValue: "",
        startDate: "",
        validUntil: "",
        maxUses: "",
        minPurchase: "",
        limitPerLearner: ""
      });
      setShowCreate(false);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  async function toggleCoupon(coupon: Coupon) {
    setToggling(coupon.id);
    try {
      const res = await fetch("/api/super-admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      });
      const p = await res.json();
      if (p.success) setCoupons((prev) => prev.map((c) => c.id === coupon.id ? p.data : c));
    } catch { /* silent */ }
    finally { setToggling(null); }
  }

  const active = coupons.filter((c) => c.isActive).length;
  const totalUses = coupons.reduce((a, c) => a + c.usedCount, 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#b45309] via-[#d97706] to-[#f59e0b] px-8 py-10 text-white shadow-[0_24px_60px_rgba(180,83,9,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Owner Controls
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Coupons & Discounts</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/88">
                  Create promotional codes, set usage limits and expiry dates.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="shrink-0 rounded-2xl bg-white px-6 py-3 text-[14px] font-semibold text-[#b45309] transition hover:bg-white/90"
              >
                + New Coupon
              </button>
            </div>
          </section>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <AdminStatCard index={0} title="Total Codes" value={loading ? "…" : coupons.length} caption="All coupons created." tone="amber" />
          <AdminStatCard index={1} title="Active" value={loading ? "…" : active} caption="Currently redeemable." tone="emerald" />
          <AdminStatCard index={2} title="Total Uses" value={loading ? "…" : totalUses} caption="Redemptions across all codes." tone="sky" />
        </StaggerGrid>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <section className="rounded-[28px] border border-[#fde68a]/60 bg-[#fffbeb] p-6">
                <h2 className="text-[18px] font-semibold text-[#92400e]">Create Coupon</h2>
                <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-3 space-y-4">
                    {/* Coupon Code */}
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-[13px] font-medium text-[#0f172a]">Coupon Code*</label>
                        <span className="text-[12px] text-[#64748b]">{form.code.length}/15</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        placeholder="Ex: GET50"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                        className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                      />
                      <p className="mt-1 text-[11px] text-[#64748b] flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Coupon code can only contain uppercase letters and numbers
                      </p>
                    </div>

                    {/* Coupon Name */}
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <label className="text-[13px] font-medium text-[#0f172a]">Coupon Name</label>
                        <span className="text-[12px] text-[#64748b]">{form.name.length}/60</span>
                      </div>
                      <input
                        type="text"
                        maxLength={60}
                        placeholder="Give name for your coupon code"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                      />
                    </div>

                    {/* Discount Type */}
                    <div>
                      <label className="mb-2 block text-[13px] font-medium text-[#0f172a]">Discount Type*</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-[14px] text-[#334155] cursor-pointer">
                          <input
                            type="radio"
                            name="discountType"
                            value="FIXED"
                            checked={form.discountType === "FIXED"}
                            onChange={() => setForm({ ...form, discountType: "FIXED" })}
                            className="accent-[#16a34a] w-4 h-4 cursor-pointer"
                          />
                          Fixed Amount
                        </label>
                        <label className="flex items-center gap-2 text-[14px] text-[#334155] cursor-pointer">
                          <input
                            type="radio"
                            name="discountType"
                            value="PERCENTAGE"
                            checked={form.discountType === "PERCENTAGE"}
                            onChange={() => setForm({ ...form, discountType: "PERCENTAGE" })}
                            className="accent-[#16a34a] w-4 h-4 cursor-pointer"
                          />
                          Percentage Discount
                        </label>
                      </div>
                    </div>

                    {/* Discount Value */}
                    <div>
                      <input
                        type="number"
                        required
                        placeholder="Discount value"
                        value={form.discountValue}
                        onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                        min={0}
                        max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                        className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                      />
                    </div>

                    {/* Start Date & Expiry Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Start Date*</label>
                        <input
                          type="date"
                          required
                          value={form.startDate}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                          className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Expiry Date</label>
                        <input
                          type="date"
                          value={form.validUntil}
                          onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                          className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                        />
                      </div>
                    </div>

                    {/* Coupon Quantity */}
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Coupon Quantity</label>
                      <input
                        type="number"
                        placeholder="Enter coupon quantity limit"
                        value={form.maxUses}
                        onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                        min={1}
                        className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                      />
                    </div>

                    {/* Minimum Purchase Amount */}
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Minimum Purchase Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]">₹</span>
                        <input
                          type="number"
                          placeholder="Enter the minimum purchase amount"
                          value={form.minPurchase}
                          onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                          min={0}
                          className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white pl-8 pr-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                        />
                      </div>
                    </div>

                    {/* Limit Per Learner */}
                    <div>
                      <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Coupon Limit Per Learner</label>
                      <input
                        type="number"
                        placeholder="Enter limit per learner"
                        value={form.limitPerLearner}
                        onChange={(e) => setForm({ ...form, limitPerLearner: e.target.value })}
                        min={1}
                        className="h-11 w-full rounded-[10px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                      />
                    </div>
                  </div>
                  {error && <p className="sm:col-span-2 lg:col-span-3 text-[13px] text-[#dc2626]">{error}</p>}
                  <div className="flex gap-3 sm:col-span-2 lg:col-span-3">
                    <button type="submit" disabled={saving} className="rounded-[14px] bg-[#d97706] px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-50 transition hover:bg-[#b45309]">
                      {saving ? "Creating…" : "Create Coupon"}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)} className="rounded-[14px] bg-white px-6 py-3 text-[14px] font-semibold text-[#64748b] transition hover:bg-[#f1f5f9]">Cancel</button>
                  </div>
                </form>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon grid */}
        <RevealSection>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              [1, 2, 3].map((i) => <div key={i} className="h-52 animate-pulse rounded-[28px] bg-white/70" />)
            ) : coupons.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-[22px] border border-dashed border-[#fde68a] bg-[#fffbeb] px-5 py-14 text-center text-[14px] text-[#92400e]">
                No coupons yet. Create your first one above.
              </div>
            ) : (
              coupons.map((coupon, i) => {
                const usagePct = Math.min((coupon.usedCount / coupon.maxUses) * 100, 100);
                return (
                  <motion.article
                    key={coupon.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                    whileHover={{ y: -4, boxShadow: "0 16px 32px rgba(15,23,42,0.1)" }}
                    className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.07)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Discount Code</p>
                        <h3 className="mt-2 font-mono text-[26px] font-black tracking-[0.12em] text-[#0f172a]">{coupon.code}</h3>
                        <p className="mt-1 text-[16px] font-semibold text-[#16a34a]">
                          {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleCoupon(coupon)}
                        disabled={toggling === coupon.id}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                          coupon.isActive
                            ? "bg-[#ecfdf5] text-[#15803d] hover:bg-[#dcfce7]"
                            : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                        } disabled:opacity-50`}
                      >
                        {toggling === coupon.id ? "…" : coupon.isActive ? "Active" : "Disabled"}
                      </button>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-[13px] text-[#64748b]">
                        <span>Usage</span>
                        <span>{coupon.usedCount} / {coupon.maxUses}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444]"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${usagePct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    </div>

                    {coupon.validUntil && (
                      <p className="mt-3 text-[12px] text-[#94a3b8]">Expires {formatShortDate(coupon.validUntil)}</p>
                    )}
                    {coupon.description && (
                      <p className="mt-1 text-[13px] text-[#64748b]">{coupon.description}</p>
                    )}
                    {coupon.name && (
                      <p className="mt-1 text-[13px] text-[#64748b]">Name: {coupon.name}</p>
                    )}
                    {coupon.minPurchase && (
                      <p className="mt-1 text-[12px] text-[#94a3b8]">Min Purchase: ₹{coupon.minPurchase}</p>
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
