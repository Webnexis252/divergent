"use client";

import { motion } from "motion/react";
import { RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import type { RevenueData } from "./_types";

export default function RevenueTrend({ trend, maxTrend }: { trend: RevenueData["monthlyTrend"]; maxTrend: number }) {
  return (
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
          {(trend ?? []).map((item, index) => {
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
  );
}
