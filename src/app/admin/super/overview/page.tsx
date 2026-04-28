"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AdminStatCard } from "../../_components/AdminStatCard";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import {
  ActivityIcon,
  CreditCardIcon,
  DollarSignIcon,
  TagIcon,
} from "../../_components/admin-icons";
import { formatShortDate } from "@/lib/date-format";
import type { RevenueData } from "./_types";

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/super-admin/revenue")
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success) setData(payload.data);
      })
      .catch((error) => {
        console.warn("Failed to load revenue overview (likely blocked by browser shields):", error.message || error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="h-40 animate-pulse rounded-[32px] bg-white/70" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[28px] bg-white/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div className="h-[28rem] animate-pulse rounded-[28px] bg-white/70" />
          <div className="h-[28rem] animate-pulse rounded-[28px] bg-white/70" />
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const maxTrend = Math.max(...(data?.monthlyTrend ?? []).map((item) => item.count), 1);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <section className="rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,#1f2937_0%,#0f172a_55%,#374151_100%)] px-8 py-8 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#fde68a]">
                  Owner View
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">
                  Business Health
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/72">
                  Revenue, transaction flow, and monthly demand signals brought into the same
                  motion language as the rest of the product.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">This month</p>
                <p className="mt-2 text-2xl font-semibold text-[#fde68a]">
                  {formatCurrency(data?.monthlyRevenue ?? 0)}
                </p>
              </div>
            </div>
          </section>
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            index={0}
            title="Total Revenue"
            value={formatCurrency(data?.totalRevenue ?? 0)}
            icon={<DollarSignIcon className="h-5 w-5" />}
            tone="sky"
          />
          <AdminStatCard
            index={1}
            title="This Month"
            value={formatCurrency(data?.monthlyRevenue ?? 0)}
            caption="Closed revenue within the current billing month."
            icon={<ActivityIcon className="h-5 w-5" />}
            tone="emerald"
          />
          <AdminStatCard
            index={2}
            title="Transactions"
            value={data?.totalTransactions ?? 0}
            caption="All recorded payment attempts across the platform."
            icon={<CreditCardIcon className="h-5 w-5" />}
            tone="amber"
          />
          <AdminStatCard
            index={3}
            title="Avg. Transaction"
            value={formatCurrency((data?.totalRevenue ?? 0) / Math.max(data?.totalTransactions ?? 1, 1))}
            caption="Average realized order value."
            icon={<TagIcon className="h-5 w-5" />}
            tone="slate"
          />
        </StaggerGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <RevealSection>
            <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                    Trend
                  </p>
                  <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                    Monthly demand trend
                  </h2>
                </div>
                <p className="text-sm text-[#64748b]">Enrollments used as the leading signal.</p>
              </div>

              <div className="mt-10 grid grid-cols-12 items-end gap-3">
                {(data?.monthlyTrend ?? []).map((item, index) => {
                  const height = `${Math.max((item.count / maxTrend) * 100, item.count ? 10 : 4)}%`;
                  return (
                    <div key={item.month} className="col-span-1 flex flex-col items-center gap-3">
                      <div className="flex h-60 w-full items-end justify-center rounded-[24px] bg-[#f6fafc] px-2 py-3">
                        <motion.div
                          className="w-full rounded-[16px] bg-[linear-gradient(180deg,#38c1ff_0%,#0f172a_100%)]"
                          initial={{ height: 0 }}
                          whileInView={{ height }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.55, delay: index * 0.04 }}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
                          {item.month}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0f172a]">{item.count}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </RevealSection>

          <RevealSection delay={0.08}>
            <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                Recent Transactions
              </p>
              <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                Latest payment activity
              </h2>

              <div className="mt-6 space-y-3">
                {data?.recentPayments?.length ? (
                  data.recentPayments.slice(0, 8).map((payment, index) => (
                    <motion.article
                      key={payment.id}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ duration: 0.35, delay: index * 0.04 }}
                      className="rounded-[22px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[#0f172a]">
                            {payment.studentName ?? "Unknown student"}
                          </p>
                          <p className="mt-1 text-sm text-[#64748b]">
                            {payment.studentEmail ?? "No email"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-bold text-[#15803d]">
                          {payment.status}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="font-semibold text-[#0f172a]">
                          {formatCurrency(payment.amount)}
                          {payment.couponCode ? (
                            <span className="ml-2 rounded-full bg-[#fff7df] px-2 py-1 text-xs font-semibold text-[#b45309]">
                              {payment.couponCode}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[#64748b]">{formatShortDate(payment.createdAt)}</div>
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <p className="rounded-[24px] border border-dashed border-[#d8e3ef] px-5 py-10 text-center text-[#64748b]">
                    No transactions yet.
                  </p>
                )}
              </div>
            </section>
          </RevealSection>
        </div>
      </div>
    </PageTransition>
  );
}
