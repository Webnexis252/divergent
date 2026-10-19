"use client";

import { ChartColumn } from "lucide-react";
import { AdminPanel, AdminPanelHeader, SummaryFigures } from "../../_components/admin-ui";
import { ColumnChart } from "../../_components/ColumnChart";
import type { RevenueData } from "./_types";

const whole = new Intl.NumberFormat("en-IN");
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** New enrollments per calendar month this year; months still to come show as empty slots. */
export default function RevenueTrend({ trend }: { trend: RevenueData["monthlyTrend"] }) {
  const now = new Date();
  // The API buckets by UTC month
  const currentMonth = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const months = trend ?? [];
  const elapsed = months.slice(0, currentMonth + 1);

  const total = elapsed.reduce((sum, m) => sum + m.count, 0);
  const average = elapsed.length ? total / elapsed.length : 0;
  const bestIndex = total > 0 ? elapsed.reduce((best, m, i) => (m.count > elapsed[best].count ? i : best), 0) : -1;

  return (
    <AdminPanel className="h-full">
      <AdminPanelHeader
        icon={ChartColumn}
        tone="sky"
        title="Enrollments by month"
        description={`New enrollments in ${year}, the leading signal for revenue`}
      />

      <SummaryFigures
        items={[
          { label: "Year to date", value: whole.format(total) },
          { label: "Monthly average", value: average >= 10 ? whole.format(Math.round(average)) : average.toFixed(1) },
          {
            label: "Best month",
            value: bestIndex >= 0 ? whole.format(elapsed[bestIndex].count) : "—",
            detail: <span className="text-[12px] text-[#64748b]">{bestIndex >= 0 ? MONTH_NAMES[bestIndex] : "No enrollments yet"}</span>,
          },
        ]}
      />

      <div className="mt-6">
        <ColumnChart
          ariaLabel={`Enrollments by month, ${year}`}
          unit="enrollments"
          formatValue={(v) => whole.format(v)}
          formatTick={(v) => compact.format(v)}
          data={months.map((m, i) => ({
            key: m.month,
            label: m.month.charAt(0) + m.month.slice(1).toLowerCase(),
            detail: `${MONTH_NAMES[i]} ${year}`,
            value: m.count,
            pending: i > currentMonth,
          }))}
        />
      </div>
    </AdminPanel>
  );
}
