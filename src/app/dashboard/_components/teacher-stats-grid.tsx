"use client";

import { AnimCard, AnimStat } from "./motion-wrappers";
import { StatIcon } from "./teacher-icons";
import { motion } from "motion/react";

export const statCards = [
  {
    title: "Doubts Resolved Today",
    value: "18",
    note: "+6 from yesterday",
    icon: "resolve" as const,
    iconBg: "bg-[#f0fdf4]",
    iconColor: "#22c55e",
  },
  {
    title: "Avg Response Time",
    value: "12 min",
    note: "3 min faster ⚡",
    icon: "clock" as const,
    iconBg: "bg-[#eff6ff]",
    iconColor: "#3b82f6",
  },
  {
    title: "Student Satisfaction",
    value: "4.8",
    note: "★★★★★",
    icon: "star" as const,
    iconBg: "bg-[#fefce8]",
    iconColor: "#f59e0b",
  },
  {
    title: "Active Students",
    value: "142",
    note: "+8 this week",
    icon: "students" as const,
    iconBg: "bg-[#faf5ff]",
    iconColor: "#a855f7",
  },
];

export function TeacherStatCard({
  title,
  value,
  note,
  icon,
  iconBg,
  iconColor,
}: (typeof statCards)[number]) {
  return (
    <AnimCard className="h-full rounded-[20px] border border-[#ededed] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-full flex-col px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className={`grid h-11 w-11 place-items-center rounded-[14px] ${iconBg}`}>
            <StatIcon icon={icon} className="h-5 w-5" />
          </div>
          <motion.div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: iconColor }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.45, 0.95, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          />
        </div>
        <div className="mt-7">
          <p className="text-[14px] font-medium text-[#4a5565]">{title}</p>
          <AnimStat className="mt-2 origin-left text-[30px] font-bold leading-none text-[#101828]">
            {value}
          </AnimStat>
          <p className="mt-2 text-[12px] text-[#6a7282]">{note}</p>
        </div>
      </div>
    </AnimCard>
  );
}
