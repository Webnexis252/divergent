"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

type Payment = {
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  amount: number;
  status: string;
  couponCode: string | null;
  createdAt: string;
};

type RevenueData = {
  totalRevenue: number;
  totalTransactions: number;
  monthlyRevenue: number;
  monthlyTransactions: number;
  recentPayments: Payment[];
  monthlyTrend: { month: string; count: number }[];
};

const statusBadge: Record<string, string> = {
  SUCCESS: "bg-[#ecfdf5] text-[#15803d]",
  PENDING: "bg-[#fff7df] text-[#b45309]",
  FAILED: "bg-[#fff1f2] text-[#dc2626]",
  REFUNDED: "bg-[#eff6ff] text-[#1d4ed8]",
};

export default function SuperAdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/revenue")
      .then((r) => r.json())
      .then((p) => { if (p.success) setData(p.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const maxTrend = Math.max(...(data?.monthlyTrend ?? []).map((m) => m.count), 1);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#14532d] via-[#15803d] to-[#16a34a] px-8 py-10 text-white shadow-[0_24px_60px_rgba(21,128,61,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Owner Controls
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Revenue</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                  Full payment history and revenue trends across the platform.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/15 bg-white/10 px-6 py-4 text-right backdrop-blur">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">This Month</p>
                <p className="mt-1 text-2xl font-semibold text-[#bbf7d0]">
                  {loading ? "…" : fmt(data?.monthlyRevenue ?? 0)}
                </p>
              </div>
            </div>
          </section>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <AdminStatCard index={0} title="Total Revenue" value={loading ? "…" : fmt(data?.totalRevenue ?? 0)} caption="All-time successful payments." tone="emerald" />
          <AdminStatCard index={1} title="This Month" value={loading ? "…" : fmt(data?.monthlyRevenue ?? 0)} caption="Revenue in the current month." tone="sky" />
          <AdminStatCard index={2} title="Transactions" value={loading ? "…" : data?.totalTransactions ?? 0} caption="Total payment attempts." tone="amber" />
          <AdminStatCard index={3} title="Avg. Order" value={loading ? "…" : fmt((data?.totalRevenue ?? 0) / Math.max(data?.totalTransactions ?? 1, 1))} caption="Average realized order value." tone="slate" />
        </StaggerGrid>

        {/* Chart + table */}
        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          {/* Monthly bar chart */}
          <RevealSection>
            <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Trend</p>
              <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-[#0f172a]">Monthly enrollment trend</h2>
              <div className="mt-8 grid grid-cols-12 items-end gap-2">
                {(data?.monthlyTrend ?? Array.from({ length: 12 }, (_, i) => ({ month: ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][i], count: 0 }))).map((item, index) => {
                  const h = `${Math.max((item.count / maxTrend) * 100, item.count ? 8 : 3)}%`;
                  return (
                    <div key={item.month} className="col-span-1 flex flex-col items-center gap-2">
                      <div className="flex h-48 w-full items-end justify-center rounded-[16px] bg-[#f6fafc] px-1 py-2">
                        <motion.div
                          className="w-full rounded-[10px] bg-gradient-to-t from-[#15803d] to-[#34d399]"
                          initial={{ height: 0 }}
                          whileInView={{ height: h }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.55, delay: index * 0.04 }}
                        />
                      </div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#94a3b8]">{item.month}</p>
                      <p className="text-[11px] font-semibold text-[#0f172a]">{item.count}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          </RevealSection>

          {/* Recent payments */}
          <RevealSection delay={0.08}>
            <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">Payments</p>
              <h2 className="mt-1 text-[24px] font-semibold tracking-[-0.04em] text-[#0f172a]">Recent transactions</h2>
              <div className="mt-6 space-y-3">
                {loading ? (
                  [1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-[16px] bg-[#f3f4f6]" />)
                ) : (data?.recentPayments ?? []).length === 0 ? (
                  <p className="text-center text-[14px] text-[#667085]">No transactions yet.</p>
                ) : (
                  (data?.recentPayments ?? []).slice(0, 10).map((p, i) => (
                    <motion.article
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-[16px] border border-[#eceef2] bg-[#fcfcfd] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-semibold text-[#101828]">{p.studentName ?? "Unknown"}</p>
                          <p className="text-[12px] text-[#94a3b8]">{p.studentEmail}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${statusBadge[p.status] ?? "bg-[#f1f5f9] text-[#64748b]"}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[12px] text-[#667085]">
                        <span className="font-semibold text-[#0f172a]">{fmt(p.amount)}</span>
                        <div className="flex items-center gap-2">
                          {p.couponCode && <span className="rounded-full bg-[#fff7df] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">{p.couponCode}</span>}
                          <span>{formatShortDate(p.createdAt)}</span>
                        </div>
                      </div>
                    </motion.article>
                  ))
                )}
              </div>
            </section>
          </RevealSection>
        </div>
      </div>
    </PageTransition>
  );
}
