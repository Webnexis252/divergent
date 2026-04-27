"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

type Coupon = {
  id: string;
  code: string;
  discountPercent: number;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  validUntil: string | null;
  description: string | null;
  createdAt: string;
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ code: "", discountPercent: "", maxUses: "100", validUntil: "", description: "" });
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
          discountPercent: parseFloat(form.discountPercent),
          maxUses: parseInt(form.maxUses) || 100,
          ...(form.validUntil && { validUntil: form.validUntil }),
          ...(form.description && { description: form.description }),
        }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create"); return; }
      setCoupons((prev) => [p.data, ...prev]);
      setForm({ code: "", discountPercent: "", maxUses: "100", validUntil: "", description: "" });
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
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
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
                  {[
                    { key: "code", label: "Code *", type: "text", placeholder: "SAVE50", span: false },
                    { key: "discountPercent", label: "Discount % *", type: "number", placeholder: "20", span: false },
                    { key: "maxUses", label: "Max Uses", type: "number", placeholder: "100", span: false },
                    { key: "validUntil", label: "Expires On", type: "date", placeholder: "", span: false },
                    { key: "description", label: "Description", type: "text", placeholder: "Summer sale promo", span: true },
                  ].map((f) => (
                    <div key={f.key} className={f.span ? "sm:col-span-2 lg:col-span-3" : ""}>
                      <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">{f.label}</label>
                      <input
                        type={f.type}
                        required={f.label.includes("*")}
                        placeholder={f.placeholder}
                        value={form[f.key as keyof typeof form]}
                        onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                        min={f.key === "discountPercent" ? 1 : f.key === "maxUses" ? 1 : undefined}
                        max={f.key === "discountPercent" ? 100 : undefined}
                        className="h-12 w-full rounded-[14px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                      />
                    </div>
                  ))}
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
                        <p className="mt-1 text-[16px] font-semibold text-[#16a34a]">{coupon.discountPercent}% OFF</p>
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
