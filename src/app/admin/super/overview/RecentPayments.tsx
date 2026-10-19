"use client";

import { m as motion } from "motion/react";
import { Receipt } from "lucide-react";
import { formatShortDate } from "@/lib/date-format";
import { AdminEmptyState, AdminPanel, AdminPanelHeader, StatusBadge } from "../../_components/admin-ui";
import type { StatusTone } from "../../_components/admin-ui";
import type { RevenueData } from "./_types";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const STATUS_TONE: Record<string, StatusTone> = {
  SUCCESS: "good",
  PENDING: "warning",
  FAILED: "critical",
  REFUNDED: "neutral",
};

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function RecentPayments({ payments }: { payments: RevenueData["recentPayments"] }) {
  return (
    <AdminPanel className="h-full">
      <AdminPanelHeader icon={Receipt} tone="emerald" title="Recent transactions" description="Latest payment activity" />

      {payments?.length ? (
        <ul className="mt-5 divide-y divide-[#f1f5f9]">
          {payments.slice(0, 8).map((payment, index) => (
            <motion.li
              key={payment.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.03 }}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-[13px] font-semibold text-[#334155]">
                  {(payment.studentName ?? payment.studentEmail ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-[#0f172a]">
                    {payment.studentName ?? "Unknown student"}
                  </p>
                  <p className="truncate text-[12px] text-[#64748b]">
                    {payment.studentEmail ?? "No email"} · {formatShortDate(payment.createdAt)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[14px] font-semibold tabular-nums text-[#0f172a]">{currency.format(payment.amount)}</span>
                <div className="flex items-center gap-1.5">
                  {payment.couponCode ? <StatusBadge tone="info">{payment.couponCode}</StatusBadge> : null}
                  <StatusBadge tone={STATUS_TONE[payment.status] ?? "neutral"}>{titleCase(payment.status)}</StatusBadge>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      ) : (
        <AdminEmptyState className="mt-5" icon={Receipt} title="No transactions yet" description="Payments will appear here as students check out." />
      )}
    </AdminPanel>
  );
}
