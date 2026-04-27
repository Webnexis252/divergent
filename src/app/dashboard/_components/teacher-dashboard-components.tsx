"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarIcon, StudentsIcon } from "./teacher-icons";
import { fadeUp } from "./motion-wrappers";

export function PanelHeader({
  icon,
  iconTone,
  title,
  subtitle,
  badge,
  actionNode,
}: {
  icon: React.ReactNode;
  iconTone: string;
  title: string;
  subtitle: string;
  badge?: string;
  actionNode?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#efefef] px-6 py-5">
      <div className="flex items-start gap-3">
        <div
          className={`grid h-9 w-9 place-items-center rounded-[12px] ${iconTone}`}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-[18px] font-medium tracking-[-0.02em] text-[#101828]">
            {title}
          </h2>
          <p className="mt-0.5 text-[12px] text-[#6a7282]">{subtitle}</p>
        </div>
      </div>
      {badge ? (
        <motion.div
          className="grid h-6 min-w-6 place-items-center rounded-full bg-[#fff3e8] px-2 text-[12px] font-semibold text-[#f97316]"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          {badge}
        </motion.div>
      ) : actionNode ? (
        actionNode
      ) : null}
    </div>
  );
}

export function TeacherClassRow({
  id,
  title,
  time,
  students,
  action,
  actionTone,
  live,
}: {
  id?: string;
  title: string;
  time: string;
  students: string;
  action: string;
  actionTone: "info" | "success";
  live?: boolean;
}) {
  const ease = [0.25, 0.46, 0.45, 0.94] as const;
  
  const content = (
    <>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
          {live ? (
            <motion.span
              className="rounded-full bg-[#ef4444] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
              animate={{ opacity: [1, 0.75, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              Live
            </motion.span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8b8b8b]">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon />
            {time}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <StudentsIcon />
            {students}
          </span>
        </div>
      </div>

      <motion.span
        className={`inline-flex min-w-[117px] items-center justify-center rounded-[10px] px-4 py-2 text-[12px] font-semibold text-white ${
          actionTone === "info" ? "bg-[#38c1ff]" : "bg-[#4caf50]"
        }`}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        transition={{ duration: 0.18 }}
      >
        {action}
      </motion.span>
    </>
  );

  return (
    <motion.article
      className="flex flex-col gap-4 rounded-[18px] border border-[#ececec] bg-white px-5 py-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease }}
      whileHover={{ y: -4, boxShadow: "0 14px 30px rgba(15,23,42,0.08)" }}
    >
      {id ? (
        <Link
          href={`/dashboard/teacher/class-control/${id}`}
          className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </motion.article>
  );
}

export function TeacherDoubtCard({
  name,
  message,
  time,
  index,
}: {
  name: string;
  message: string;
  time: string;
  index: number;
}) {
  const ease = [0.25, 0.46, 0.45, 0.94] as const;

  return (
    <motion.article
      className="rounded-[14px] border border-[#efefef] bg-white px-4 py-3"
      variants={fadeUp}
      transition={{ duration: 0.45, ease, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: "0 14px 28px rgba(15,23,42,0.08)" }}
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="mt-0.5 h-[51px] w-[51px] shrink-0 rounded-full bg-[#e2e2e2]"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 3.1 + index * 0.2, repeat: Infinity }}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-black">{name}</p>
          <p className="mt-1 text-[10px] leading-[1.45] text-[#595959]">
            {message}
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[8px] text-[#868686]">{time}</span>
            <motion.button
              className="rounded-[10px] bg-[#38c1ff] px-5 py-1.5 text-[11px] font-medium text-white"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.18 }}
            >
              Reply
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function TeacherBarChart({ snapshot }: { snapshot: { progressBars: { month: string; value: number }[]; lowEngagementCount: number; missedAssignments: number } }) {
  const ease = [0.25, 0.46, 0.45, 0.94] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="overflow-hidden rounded-[16px] bg-white/55 p-4 sm:p-6">
        <div className="flex h-[320px] items-stretch gap-4 sm:gap-6">
          <div className="hidden w-10 flex-col justify-between pb-7 text-[10px] text-[#949494] sm:flex">
            <span>1000</span>
            <span>800</span>
            <span>600</span>
            <span>400</span>
            <span>200</span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="grid h-[292px] grid-cols-12 items-end gap-3 border-b border-l border-[#dfdfdf] pb-3 pl-3">
              {snapshot.progressBars.map((bar, index) => (
                <motion.div
                  key={bar.month}
                  className="flex h-full items-end justify-center"
                  initial={{ opacity: 0, scaleY: 0.2 }}
                  whileInView={{ opacity: 1, scaleY: 1 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, ease, delay: index * 0.04 }}
                  style={{ transformOrigin: "bottom center" }}
                >
                  <div
                    className="w-full rounded-t-full bg-[#6f63ff] shadow-[0_0_14px_rgba(111,99,255,0.22)]"
                    style={{ height: `${bar.value}%` }}
                  />
                </motion.div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-12 gap-3 pl-3 text-center text-[9px] tracking-[0.1em] text-[#949494] sm:text-[11px]">
              {snapshot.progressBars.map((bar) => (
                <span key={bar.month}>{bar.month}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <motion.div
          className="rounded-[20px] border border-[#f0dede] bg-[rgba(255,187,187,0.2)] px-7 py-6 text-right"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease }}
        >
          <p className="text-[20px] font-semibold text-black">Low Engagement</p>
          <p className="mt-2 text-[12px] text-[#666]">
            Students inactive this week
          </p>
          <motion.p
            className="mt-6 text-[48px] font-medium leading-none text-[#ff5b5b]"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            {snapshot.lowEngagementCount}
          </motion.p>
        </motion.div>

        <motion.div
          className="rounded-[20px] border border-[#ffeccc] bg-[#fffcf5] px-7 py-6 text-right"
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease, delay: 0.1 }}
        >
          <p className="text-[20px] font-semibold text-black">Missed Asgn.</p>
          <p className="mt-2 text-[12px] text-[#666]">
            Past due submissions
          </p>
          <motion.p
            className="mt-6 text-[48px] font-medium leading-none text-[#f59e0b]"
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, delay: 0.4 }}
          >
            {snapshot.missedAssignments}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
