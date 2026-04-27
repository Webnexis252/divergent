"use client";

import { motion } from "motion/react";
import { formatShortDate } from "@/lib/date-format";
import { RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import type { RevenueData } from "./_types";

export default function RecentPayments({ payments }: { payments: RevenueData["recentPayments"] }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <RevealSection delay={0.08}>
      <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
          Recent Transactions
        </p>
        <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#0f172a]">
          Latest payment activity
        </h2>

        <div className="mt-6 space-y-3">
          {payments?.length ? (
            payments.slice(0, 8).map((payment, index) => (
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
  );
}
