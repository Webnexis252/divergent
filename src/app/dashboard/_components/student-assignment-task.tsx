/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { DashboardSidebar } from "./sidebar-nav";
import {
  AnimCard,
  AnimHeading,
  AnimStat,
  FloatPulse,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "./motion-wrappers";
import type { AssignmentTask } from "../assignments/assignments-data";

const imgTaskIllustration =
  "https://api.dicebear.com/9.x/shapes/svg?seed=9c1c3836-f9b9-477b-bb06-01dfec5a7040";

function ClockIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.5 12.5 10.5 15.5 16.5 9.5" />
      <circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 3v4a2 2 0 0 0 2 2h4" />
      <path d="M6 3h8l6 6v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  );
}

function MetaChip({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 rounded-full border border-white/45 bg-white/12 px-4 py-2 text-[13px] font-medium text-white/95 backdrop-blur-sm"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
    >
      {icon}
      {label}
    </motion.div>
  );
}

function InfoCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <AnimCard className="rounded-[20px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
      <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#6b7280]">
        {title}
      </p>
      <AnimStat className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.04em] text-black">
        {value}
      </AnimStat>
      <p className="mt-2 text-[13px] text-[#6b7280]">{note}</p>
    </AnimCard>
  );
}

function ChecklistCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "sky" | "amber";
}) {
  const accent =
    tone === "sky"
      ? "border-[#d7ecff] bg-[#f4fbff]"
      : "border-[#fee7a8] bg-[#fff8e2]";

  return (
    <div className={`rounded-[20px] border ${accent} px-5 py-5`}>
      <h3 className="text-[22px] font-semibold tracking-[-0.03em] text-black">
        {title}
      </h3>
      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item}
            className="flex items-start gap-3 rounded-[14px] bg-white/85 px-4 py-3"
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            whileHover={{ x: 4 }}
          >
            <div className="mt-0.5 rounded-full bg-[#111827] p-1 text-white">
              <CheckIcon />
            </div>
            <p className="text-[14px] leading-6 text-[#374151]">{item}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ResourceCard({
  title,
  type,
  detail,
  index,
}: AssignmentTask["resources"][number] & { index: number }) {
  return (
    <motion.article
      className="rounded-[18px] border border-[#eceef2] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: "0 16px 28px rgba(15,23,42,0.08)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-[12px] bg-[#38c1ff]/10 p-3 text-[#38c1ff]">
          <FileIcon />
        </div>
        <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-[11px] font-semibold text-[#6b7280]">
          {type}
        </span>
      </div>
      <h4 className="mt-4 text-[18px] font-semibold text-black">{title}</h4>
      <p className="mt-2 text-[14px] leading-6 text-[#6b7280]">{detail}</p>
    </motion.article>
  );
}

function RubricRow({
  label,
  score,
  weight,
  tone,
  index,
}: AssignmentTask["rubric"][number] & { index: number }) {
  return (
    <motion.article
      className="rounded-[16px] bg-[#f8fafc] px-4 py-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-black">{label}</p>
        <span className="text-[13px] font-medium text-[#6b7280]">{score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <motion.div
          className={`h-full rounded-full ${tone}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${weight}%` }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: index * 0.05 }}
        />
      </div>
    </motion.article>
  );
}

export function StudentAssignmentTask({
  assignment,
}: {
  assignment: AssignmentTask;
}) {
  return (
    <div className="text-black">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <DashboardSidebar />

          <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1293px] space-y-8">
              <RevealSection>
                <section className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#38c1ff_0%,#54cdfd_50%,#fec600_100%)] px-6 py-7 shadow-[0_18px_42px_rgba(56,193,255,0.25)] sm:px-8 lg:px-10">
                  <motion.div
                    className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-white/15"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.6, 0.35] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="pointer-events-none absolute -bottom-12 right-20 h-36 w-36 rounded-full bg-[#111827]/10"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.45, 0.2] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  />

                  <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <div>
                      <Link
                        href="/dashboard/assignments"
                        className="inline-flex items-center gap-2 text-[13px] font-medium text-white/90 transition hover:text-white"
                      >
                        <ArrowIcon />
                        Back to assignments
                      </Link>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-white px-4 py-2 text-[12px] font-semibold text-[#38c1ff]">
                          {assignment.course}
                        </span>
                        <span className="rounded-full bg-[#111827]/10 px-4 py-2 text-[12px] font-semibold text-white">
                          {assignment.status}
                        </span>
                      </div>

                      <h1 className="mt-5 max-w-[760px] text-[clamp(2.1rem,5vw,4.3rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
                        {assignment.title}
                      </h1>
                      <p className="mt-4 max-w-[720px] text-[16px] leading-7 text-white/90">
                        {assignment.description}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <MetaChip icon={<ClockIcon />} label={assignment.estimatedTime} />
                        <MetaChip icon={<FileIcon />} label={assignment.format} />
                        <MetaChip icon={<CheckIcon />} label={assignment.points} />
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center">
                      <FloatPulse className="w-[220px]">
                        <img
                          alt=""
                          src={imgTaskIllustration}
                          className="mx-auto h-[220px] w-[220px] object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.18)]"
                        />
                      </FloatPulse>
                    </div>
                  </div>
                </section>
              </RevealSection>

              <RevealSection delay={0.06}>
                <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InfoCard
                    title="Due Date"
                    value={assignment.deadline}
                    note="Late submissions may reduce the final score."
                  />
                  <InfoCard
                    title="Module"
                    value={assignment.module}
                    note={`Difficulty: ${assignment.difficulty}`}
                  />
                  <InfoCard
                    title="Submission"
                    value={assignment.submissionType}
                    note={`Format: ${assignment.format}`}
                  />
                  <InfoCard
                    title="Progress"
                    value={`${assignment.progress}%`}
                    note="Based on your current task completion."
                  />
                </StaggerGrid>
              </RevealSection>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">
                  <RevealSection delay={0.08}>
                    <section className="rounded-[24px] bg-white px-6 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.08)] sm:px-7">
                      <AnimHeading className="text-[30px] font-semibold tracking-[-0.04em] text-black">
                        Assignment Brief
                      </AnimHeading>
                      <p className="mt-5 text-[16px] leading-7 text-[#4b5563]">
                        {assignment.objective}
                      </p>

                      <div className="mt-6 space-y-4">
                        {assignment.overview.map((item, index) => (
                          <motion.article
                            key={item}
                            className="rounded-[18px] bg-[#f8fafc] px-5 py-4"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.45, delay: index * 0.05 }}
                            whileHover={{ y: -3 }}
                          >
                            <p className="text-[15px] leading-7 text-[#374151]">{item}</p>
                          </motion.article>
                        ))}
                      </div>
                    </section>
                  </RevealSection>

                  <RevealSection delay={0.12}>
                    <div className="grid gap-6 lg:grid-cols-2">
                      <ChecklistCard
                        title="Deliverables"
                        items={assignment.deliverables}
                        tone="sky"
                      />
                      <ChecklistCard
                        title="Submission Checklist"
                        items={assignment.checklist}
                        tone="amber"
                      />
                    </div>
                  </RevealSection>

                  <RevealSection delay={0.16}>
                    <section className="rounded-[24px] bg-white px-6 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.08)] sm:px-7">
                      <AnimHeading className="text-[30px] font-semibold tracking-[-0.04em] text-black">
                        Helpful Resources
                      </AnimHeading>
                      <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        {assignment.resources.map((resource, index) => (
                          <ResourceCard key={resource.title} {...resource} index={index} />
                        ))}
                      </div>
                    </section>
                  </RevealSection>

                  <RevealSection delay={0.2}>
                    <section className="rounded-[24px] bg-white px-6 py-6 shadow-[0_12px_28px_rgba(0,0,0,0.08)] sm:px-7">
                      <AnimHeading className="text-[30px] font-semibold tracking-[-0.04em] text-black">
                        Evaluation Rubric
                      </AnimHeading>
                      <div className="mt-6 space-y-3">
                        {assignment.rubric.map((item, index) => (
                          <RubricRow key={item.label} {...item} index={index} />
                        ))}
                      </div>
                    </section>
                  </RevealSection>
                </div>

                <RevealSection delay={0.12}>
                  <aside className="space-y-5 xl:sticky xl:top-[110px] xl:self-start">
                    <section className="rounded-[24px] bg-white px-5 py-5 shadow-[0_12px_28px_rgba(0,0,0,0.08)]">
                      <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#38c1ff]">
                        Submission Panel
                      </p>
                      <p className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.04em] text-black">
                        Ready to work on it?
                      </p>
                      <p className="mt-3 text-[14px] leading-6 text-[#6b7280]">
                        Start with your first draft, then come back and upload the final version before the deadline.
                      </p>

                      <div className="mt-5 rounded-[18px] bg-[#f8fafc] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[13px] font-medium text-[#6b7280]">
                            Completion readiness
                          </span>
                          <span className="text-[13px] font-semibold text-black">
                            {assignment.progress}%
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                          <motion.div
                            className="h-full rounded-full bg-[#38c1ff]"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${assignment.progress}%` }}
                            viewport={{ once: true, margin: "-40px" }}
                            transition={{ duration: 0.75 }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <motion.button
                          type="button"
                          className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#38c1ff] text-[14px] font-semibold text-white shadow-[0_16px_30px_rgba(56,193,255,0.24)]"
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                        >
                          Upload Draft
                        </motion.button>
                        <motion.button
                          type="button"
                          className="flex h-12 w-full items-center justify-center rounded-[16px] border border-[#111827] text-[14px] font-semibold text-black"
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                        >
                          Mark as Ready
                        </motion.button>
                      </div>
                    </section>

                    <section className="rounded-[24px] bg-[#111827] px-5 py-5 text-white shadow-[0_12px_28px_rgba(17,24,39,0.18)]">
                      <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-[#fec600]">
                        Mentor Note
                      </p>
                      <p className="mt-4 text-[15px] leading-7 text-white/88">
                        {assignment.supportNote}
                      </p>
                    </section>
                  </aside>
                </RevealSection>
              </div>
            </div>
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
