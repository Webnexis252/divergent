"use client";

import { motion } from "motion/react";
import { formatRelativeTime } from "@/lib/date-format";
import { RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import type { AdminOverviewData } from "./_types";
import { priorityTone } from "./_types";

export function RecentEnrollments({ enrollments }: { enrollments: AdminOverviewData["recentEnrollments"] }) {
  return (
    <RevealSection>
      <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
              Enrollments
            </p>
            <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#0f172a]">
              Recent student momentum
            </h2>
          </div>
          <p className="text-sm text-[#64748b]">Most recent joins across the last 7 days.</p>
        </div>

        <div className="mt-6 space-y-3">
          {enrollments?.length ? (
            enrollments.map((enrollment, index) => (
              <motion.article
                key={`${enrollment.studentEmail}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                whileHover={{ x: 5 }}
                className="flex flex-col gap-4 rounded-[24px] border border-[#eef2f7] bg-[#fbfdff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#d9f4ff_0%,#effbff_100%)] text-sm font-bold text-[#0284c7]">
                    {(enrollment.studentName ?? enrollment.studentEmail ?? "S").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f172a]">
                      {enrollment.studentName ?? "Unnamed student"}
                    </p>
                    <p className="text-sm text-[#64748b]">{enrollment.courseTitle}</p>
                  </div>
                </div>
                <div className="text-sm text-[#64748b]">
                  {formatRelativeTime(enrollment.createdAt)}
                </div>
              </motion.article>
            ))
          ) : (
            <p className="rounded-[24px] border border-dashed border-[#d8e3ef] px-5 py-10 text-center text-[#64748b]">
              No recent enrollments.
            </p>
          )}
        </div>
      </section>
    </RevealSection>
  );
}

export function OpenDoubts({ doubts }: { doubts: AdminOverviewData["recentDoubts"] }) {
  return (
    <RevealSection>
      <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
          Support Queue
        </p>
        <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#0f172a]">
          Open doubts
        </h2>

        <div className="mt-6 space-y-3">
          {doubts?.length ? (
            doubts.map((doubt, index) => (
              <motion.article
                key={doubt.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.05, duration: 0.35 }}
                className="rounded-[22px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#0f172a]">{doubt.subject}</p>
                    <p className="mt-1 text-sm text-[#64748b]">
                      by {doubt.studentName ?? "Unknown student"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityTone[doubt.priority]}`}>
                    {doubt.priority}
                  </span>
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
                  {formatRelativeTime(doubt.createdAt)}
                </p>
              </motion.article>
            ))
          ) : (
            <p className="rounded-[24px] border border-dashed border-[#d8e3ef] px-5 py-10 text-center text-[#64748b]">
              All doubts answered.
            </p>
          )}
        </div>
      </section>
    </RevealSection>
  );
}
