"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, IndianRupee, Minus } from "lucide-react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { AdminPageHeader, AdminPanel, AdminPanelHeader, StatusBadge, SummaryFigures } from "../../_components/admin-ui";
import { ColumnChart } from "../../_components/ColumnChart";
import { ActivityIcon, CreditCardIcon, RupeeIcon, TagIcon } from "../../_components/admin-icons";
import RecentPayments from "../overview/RecentPayments";
import RevenueTrend from "../overview/RevenueTrend";
import type { RevenueData as OverviewRevenueData } from "../overview/_types";

type RevenueData = OverviewRevenueData & {
  dailyRevenue: { date: string; revenue: number }[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const compactRupees = (n: number) =>
  `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
// Daily keys are UTC days (YYYY-MM-DD)
const dayLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const dayDetail = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function DailyRevenue({ days }: { days: RevenueData["dailyRevenue"] }) {
  const total = days.reduce((sum, d) => sum + d.revenue, 0);
  const today = days.at(-1)?.revenue ?? 0;
  const yesterday = days.at(-2)?.revenue ?? 0;
  const delta = yesterday > 0 ? Math.round(((today - yesterday) / yesterday) * 100) : null;
  const best = total > 0 ? days.reduce((top, d) => (d.revenue > top.revenue ? d : top), days[0]) : null;

  const deltaBadge =
    today === yesterday ? (
      <StatusBadge tone="neutral" icon={Minus}>Same as yesterday</StatusBadge>
    ) : delta === null ? (
      <StatusBadge tone="good" icon={ArrowUpRight}>Up from ₹0</StatusBadge>
    ) : (
      <StatusBadge tone={delta >= 0 ? "good" : "critical"} icon={delta >= 0 ? ArrowUpRight : ArrowDownRight}>
        {delta >= 0 ? "+" : ""}
        {delta}% vs yesterday
      </StatusBadge>
    );

  return (
    <AdminPanel>
      <AdminPanelHeader icon={CalendarDays} tone="emerald" title="Daily revenue" description="Successful payments per day, last 30 days" />

      <SummaryFigures
        items={[
          { label: "Last 30 days", value: fmt(total) },
          { label: "Today", value: fmt(today), detail: deltaBadge },
          {
            label: "Best day",
            value: best ? fmt(best.revenue) : "—",
            detail: (
              <span className="text-[12px] text-[#64748b]">
                {best ? dayDetail.format(new Date(`${best.date}T00:00:00Z`)) : "No revenue yet"}
              </span>
            ),
          },
        ]}
      />

      <div className="mt-6">
        <ColumnChart
          ariaLabel="Revenue per day, last 30 days"
          formatValue={fmt}
          formatTick={compactRupees}
          data={days.map((d, i) => {
            const date = new Date(`${d.date}T00:00:00Z`);
            return {
              key: d.date,
              label: dayLabel.format(date),
              detail: dayDetail.format(date),
              value: d.revenue,
              // Label every fifth day, counted back from today so today is always labelled
              showLabel: (days.length - 1 - i) % 5 === 0,
            };
          })}
        />
      </div>
    </AdminPanel>
  );
}

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

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Owner controls"
            icon={IndianRupee}
            title="Revenue"
            description="Payment history and revenue trends across the platform."
            actions={
              <div className="flex items-center gap-3 rounded-[16px] border border-[#e8edf3] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#ecfdf3] text-[#15803d]">
                  <IndianRupee className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-medium text-[#64748b]">Revenue this month</p>
                  <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#0f172a]">
                    {loading ? "…" : fmt(data?.monthlyRevenue ?? 0)}
                  </p>
                </div>
              </div>
            }
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard index={0} title="Total revenue" value={loading ? "…" : fmt(data?.totalRevenue ?? 0)} caption="All-time successful payments." icon={<RupeeIcon className="h-5 w-5" />} tone="emerald" />
          <AdminStatCard index={1} title="This month" value={loading ? "…" : fmt(data?.monthlyRevenue ?? 0)} trend={loading ? undefined : `${data?.monthlyTransactions ?? 0} payments`} caption="Revenue in the current month." icon={<ActivityIcon className="h-5 w-5" />} tone="sky" />
          <AdminStatCard index={2} title="Transactions" value={loading ? "…" : data?.totalTransactions ?? 0} caption="Successful payments to date." icon={<CreditCardIcon className="h-5 w-5" />} tone="amber" />
          <AdminStatCard index={3} title="Avg. order" value={loading ? "…" : fmt((data?.totalRevenue ?? 0) / Math.max(data?.totalTransactions ?? 1, 1))} caption="Average realized order value." icon={<TagIcon className="h-5 w-5" />} tone="slate" />
        </StaggerGrid>

        {loading ? (
          <div className="space-y-6">
            <div className="h-[460px] animate-pulse rounded-[24px] bg-white/70" />
            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              <div className="h-[460px] animate-pulse rounded-[24px] bg-white/70" />
              <div className="h-[460px] animate-pulse rounded-[24px] bg-white/70" />
            </div>
          </div>
        ) : (
          <>
            <RevealSection>
              <DailyRevenue days={data?.dailyRevenue ?? []} />
            </RevealSection>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
              <RevealSection>
                <RevenueTrend trend={data?.monthlyTrend ?? []} />
              </RevealSection>
              <RevealSection delay={0.06}>
                <RecentPayments payments={data?.recentPayments ?? []} />
              </RevealSection>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
