"use client";

import { m as motion } from "motion/react";
import { ReactNode } from "react";
import { AnimStat, fadeUp } from "@/app/dashboard/_components/motion-wrappers";

const toneStyles = {
  sky: {
    chip: "bg-[#e0f2fe] text-[#0284c7]",
    trend: "bg-[#f0f9ff] text-[#0369a1]",
  },
  emerald: {
    chip: "bg-[#dcfce7] text-[#15803d]",
    trend: "bg-[#ecfdf3] text-[#15803d]",
  },
  amber: {
    chip: "bg-[#fef3c7] text-[#b45309]",
    trend: "bg-[#fffbeb] text-[#b45309]",
  },
  slate: {
    chip: "bg-[#f1f5f9] text-[#475569]",
    trend: "bg-[#f1f5f9] text-[#475569]",
  },
  rose: {
    chip: "bg-[#ffe4e6] text-[#be123c]",
    trend: "bg-[#fef2f2] text-[#b91c1c]",
  },
  violet: {
    chip: "bg-[#ede9fe] text-[#6d28d9]",
    trend: "bg-[#f5f3ff] text-[#6d28d9]",
  },
} as const;

/** KPI tile: icon chip and optional badge, then the label, the figure and a short note. */
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
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -3 }}
      className="h-full rounded-[20px] border border-[#e8edf3] bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition-shadow hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      {icon || trend ? (
        <div className="mb-5 flex items-start justify-between gap-3">
          {icon ? (
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] [&_svg]:h-5 [&_svg]:w-5 ${styles.chip}`}>
              {icon}
            </div>
          ) : (
            <span />
          )}
          {trend ? (
            <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles.trend}`}>
              {trend}
            </span>
          ) : null}
        </div>
      ) : null}
      <h3 className="text-[13px] font-medium text-[#64748b]">{title}</h3>
      <AnimStat className="mt-1.5 text-[30px] font-semibold leading-none tracking-[-0.03em] text-[#0f172a]">
        {value}
      </AnimStat>
      {caption ? <p className="mt-3 text-[12px] leading-5 text-[#64748b]">{caption}</p> : null}
    </motion.article>
  );
}
