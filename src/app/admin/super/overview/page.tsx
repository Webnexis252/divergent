"use client";

import { useEffect, useState } from "react";
import { IndianRupee, TrendingUp } from "lucide-react";
import { AdminStatCard } from "../../_components/AdminStatCard";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import {
  ActivityIcon,
  CreditCardIcon,
  RupeeIcon,
  TagIcon,
} from "../../_components/admin-icons";
import { AdminPageHeader } from "../../_components/admin-ui";
import RecentPayments from "./RecentPayments";
import RevenueTrend from "./RevenueTrend";
import type { RevenueData } from "./_types";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <div className="h-28 animate-pulse rounded-[24px] bg-white/70" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[168px] animate-pulse rounded-[20px] bg-white/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div className="h-[28rem] animate-pulse rounded-[24px] bg-white/70" />
          <div className="h-[28rem] animate-pulse rounded-[24px] bg-white/70" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Owner view"
            icon={TrendingUp}
            title="Business health"
            description="Revenue, transaction flow and monthly demand across the whole platform."
            actions={
              <div className="flex items-center gap-3 rounded-[16px] border border-[#e8edf3] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#ecfdf3] text-[#15803d]">
                  <IndianRupee className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-medium text-[#64748b]">Revenue this month</p>
                  <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#0f172a]">
                    {formatCurrency(data?.monthlyRevenue ?? 0)}
                  </p>
                </div>
              </div>
            }
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            index={0}
            title="Total revenue"
            value={formatCurrency(data?.totalRevenue ?? 0)}
            caption="All successful payments to date."
            icon={<RupeeIcon className="h-5 w-5" />}
            tone="sky"
          />
          <AdminStatCard
            index={1}
            title="This month"
            value={formatCurrency(data?.monthlyRevenue ?? 0)}
            trend={`${data?.monthlyTransactions ?? 0} payments`}
            caption="Closed revenue within the current billing month."
            icon={<ActivityIcon className="h-5 w-5" />}
            tone="emerald"
          />
          <AdminStatCard
            index={2}
            title="Transactions"
            value={data?.totalTransactions ?? 0}
            caption="Successful payments across the platform."
            icon={<CreditCardIcon className="h-5 w-5" />}
            tone="amber"
          />
          <AdminStatCard
            index={3}
            title="Avg. transaction"
            value={formatCurrency((data?.totalRevenue ?? 0) / Math.max(data?.totalTransactions ?? 1, 1))}
            caption="Average realized order value."
            icon={<TagIcon className="h-5 w-5" />}
            tone="slate"
          />
        </StaggerGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
          <RevealSection>
            <RevenueTrend trend={data?.monthlyTrend ?? []} />
          </RevealSection>
          <RevealSection delay={0.06}>
            <RecentPayments payments={data?.recentPayments ?? []} />
          </RevealSection>
        </div>
      </div>
    </PageTransition>
  );
}
