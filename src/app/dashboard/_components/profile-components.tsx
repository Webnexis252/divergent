"use client";

import { motion } from "motion/react";
import { cx } from "@/lib/cx";

// --- Stat Card ---
export function ProfileStatCard({
  title,
  value,
  image,
  bgColor = "bg-[#72d3ff]",
}: {
  title: string;
  value: string | number;
  image: string;
  bgColor?: string;
}) {
  return (
    <motion.div
      className={cx(
        "relative flex flex-col justify-end overflow-hidden rounded-[20px] p-6 text-white shadow-[0_4px_10px_rgba(0,0,0,0.15)]",
        bgColor,
        "h-[150px] w-full"
      )}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <img
        alt=""
        className="absolute right-4 top-4 h-[70px] w-[70px] object-contain opacity-80"
        src={image}
      />
      <div className="relative z-10 flex flex-col items-start">
        <span className="text-[48px] font-bold leading-none">{value}</span>
        <span className="mt-1 text-[16px] font-semibold opacity-90">{title}</span>
      </div>
    </motion.div>
  );
}

// --- Radar Chart ---
export function SkillsRadarChart({
  skills,
}: {
  skills: { label: string; value: number; color: string }[];
}) {
  const size = 300;
  const center = size / 2;
  const radius = size * 0.35;
  const angleStep = (Math.PI * 2) / skills.length;



  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[300px] w-[300px]">
        <svg className="h-full w-full" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circles */}
          {[0.2, 0.4, 0.6, 0.8, 1].map((step) => (
            <circle
              key={step}
              cx={center}
              cy={center}
              fill="none"
              r={radius * step}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          ))}
          {/* Axis lines */}
          {skills.map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            return (
              <line
                key={i}
                stroke="#e2e8f0"
                strokeWidth="1"
                x1={center}
                x2={center + radius * Math.cos(angle)}
                y1={center}
                y2={center + radius * Math.sin(angle)}
              />
            );
          })}
          {/* Skill segments */}
          {skills.map((s, i) => {
            const angleStart = i * angleStep - Math.PI / 2;
            const angleEnd = (i + 1) * angleStep - Math.PI / 2;
            const r = (radius * s.value) / 100;
            const x1 = center + r * Math.cos(angleStart);
            const y1 = center + r * Math.sin(angleStart);
            const x2 = center + r * Math.cos(angleEnd);
            const y2 = center + r * Math.sin(angleEnd);

            return (
              <path
                key={i}
                d={`M ${center} ${center} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
                fill={s.color}
                fillOpacity="0.4"
                stroke={s.color}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-4 w-full space-y-2">
        {skills.map((s) => (
          <div key={s.label} className="flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[14px] font-medium text-black">{s.label}</span>
            </div>
            <span className="text-[14px] font-bold text-black">{s.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Attendance Circle ---
export function AttendanceCircle({
  percent,
  classes,
  total,
}: {
  percent: number;
  classes: number;
  total: number;
}) {
  const safeTotal = Math.max(total, 0);
  const ratioPercent =
    safeTotal > 0 ? Math.round((Math.max(classes, 0) / safeTotal) * 100) : 0;
  const displayPercent = Math.max(0, Math.min(safeTotal > 0 ? ratioPercent : percent, 100));

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="relative flex h-[140px] w-[140px] items-center justify-center">
        <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            fill="none"
            r="40"
            stroke="#f1f5f9"
            strokeWidth="10"
          />
          <motion.circle
            cx="50"
            cy="50"
            fill="none"
            initial={{ strokeDasharray: "0 251" }}
            r="40"
            stroke="#f5ba00"
            strokeDasharray="251"
            strokeLinecap="round"
            strokeWidth="10"
            whileInView={{ strokeDasharray: `${(displayPercent / 100) * 251} 251` }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <span className="absolute text-[28px] font-bold text-black">{displayPercent}%</span>
      </div>
      <div className="mt-4">
        <h4 className="text-[18px] font-semibold text-black">Attendance</h4>
        <p className="text-[14px] text-gray-500">
          <span className="font-bold text-black">{classes}/{total}</span> Classes attended
        </p>
      </div>
    </div>
  );
}

// --- Weekly Goal ---
export function ProfileGoalRow({
  title,
  percent,
  completed,
  color = "#38c1ff",
}: {
  title: string;
  percent: number;
  completed: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[12px] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div
        className={cx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
          completed ? "border-[#4caf50] bg-[#4caf50]" : "border-gray-200"
        )}
      >
        {completed && (
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-[14px] font-semibold text-black">{title}</span>
          <span className="text-[14px] font-bold text-black">{percent}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            style={{ backgroundColor: color }}
            whileInView={{ width: `${percent}%` }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Topic Mastery ---
export function TopicMasteryBar({
  label,
  value,
  color = "#ffbf00",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-4">
      <span className="text-[14px] font-bold text-black">{label}</span>
      <div className="h-8 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          style={{ backgroundColor: color }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// --- Notification Item ---
export function ProfileNotificationItem({
  title,
  body,
  timeText,
  color = "#38c1ff",
  bgColor = "bg-blue-50",
}: {
  title: string;
  body: string;
  timeText: string;
  color?: string;
  bgColor?: string;
}) {
  return (
    <div className={cx("flex gap-3 rounded-[12px] p-3", bgColor)}>
      <div
        className="h-2 w-2 mt-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-[14px] font-bold text-black">{title}</p>
        <p className="text-[12px] text-gray-500">{body}</p>
        <p className="mt-1 text-[11px]" style={{ color }}>
          {timeText}
        </p>
      </div>
    </div>
  );
}

// --- Skeleton Loader ---
export function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      {/* Banner Skeleton */}
      <div className="h-[200px] w-full rounded-[24px] bg-gray-200" />
      
      {/* Top Stats Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-[150px] w-full rounded-[20px] bg-gray-200" />
        <div className="h-[150px] w-full rounded-[20px] bg-gray-200" />
        <div className="h-[150px] w-full rounded-[24px] bg-gray-200" />
      </div>

      {/* Charts & Lists Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-[400px] w-full rounded-[24px] bg-gray-200" />
        <div className="space-y-6">
          <div className="h-[250px] w-full rounded-[24px] bg-gray-200" />
          <div className="h-[250px] w-full rounded-[24px] bg-gray-200" />
        </div>
        <div className="h-[400px] w-full rounded-[24px] bg-gray-200" />
      </div>

      {/* Mastery Skeleton */}
      <div className="h-[300px] w-full rounded-[24px] bg-gray-200" />
    </div>
  );
}
