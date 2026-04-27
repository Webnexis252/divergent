"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";
import { AnimStat, fadeUp } from "@/app/dashboard/_components/motion-wrappers";

const toneStyles = {
  sky: {
    border: "from-[#38c1ff] via-[#60d8ff] to-[#0ea5e9]",
    glow: "bg-[#e8f8ff] text-[#0f86be]",
    trend: "bg-[#edfaff] text-[#0284c7]",
  },
  emerald: {
    border: "from-[#34d399] via-[#4ade80] to-[#10b981]",
    glow: "bg-[#ecfdf5] text-[#059669]",
    trend: "bg-[#eafff2] text-[#15803d]",
  },
  amber: {
    border: "from-[#fbbf24] via-[#f59e0b] to-[#ea580c]",
    glow: "bg-[#fff7df] text-[#b45309]",
    trend: "bg-[#fff4db] text-[#b45309]",
  },
  slate: {
    border: "from-[#94a3b8] via-[#64748b] to-[#334155]",
    glow: "bg-[#f1f5f9] text-[#475569]",
    trend: "bg-[#f8fafc] text-[#475569]",
  },
} as const;

export function AdminStatCard({
  title,
  value,
  trend,
  caption,
  icon,
  index = 0,
  tone = "sky",
}: {
  title: string;
  value: string | number;
  trend?: string;
  caption?: string;
  icon?: ReactNode;
  index?: number;
  tone?: keyof typeof toneStyles;
}) {
  const styles = toneStyles[tone];

  return (
    <motion.article
      variants={fadeUp}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      whileHover={{ y: -6, boxShadow: "0 24px 50px rgba(15,23,42,0.1)" }}
      className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]"
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${styles.border}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#64748b]">
            {title}
          </h3>
          <AnimStat className="text-[42px] font-semibold leading-none tracking-[-0.05em] text-[#0f172a]">
            {value}
          </AnimStat>
        </div>
        {icon && (
          <div className={`grid h-12 w-12 place-items-center rounded-2xl ${styles.glow}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="max-w-[18rem] text-sm leading-6 text-[#64748b]">
          {caption ?? "Live data from the latest platform snapshot."}
        </p>
        {trend ? (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles.trend}`}>
            {trend}
          </span>
        ) : null}
      </div>
    </motion.article>
  );
}
