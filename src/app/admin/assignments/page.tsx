"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

type Assignment = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  points: number;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  createdAt: string;
  course: { title: string } | null;
  submissions: { id: string; score: number | null }[];
};

const statusBadge = {
  ACTIVE: "bg-[#ecfdf5] text-[#15803d]",
  DRAFT: "bg-[#f1f5f9] text-[#64748b]",
  CLOSED: "bg-[#fff1f2] text-[#dc2626]",
};

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Use the teacher assignments endpoint — admins can see all
    fetch("/api/teacher/assignments")
      .then(async (r) => {
        const text = await r.text();
        if (!text) throw new Error(`Empty response (HTTP ${r.status})`);
        const p = JSON.parse(text);
        if (p.success) {
          setAssignments(p.data?.assignments ?? p.data ?? []);
        } else {
          setError(p.error ?? "Failed to load assignments");
          console.error("[assignments] API error:", p.error);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Network error — could not reach the server.");
      })
      .finally(() => setLoading(false));
  }, []);

  const active = assignments.filter((a) => a.status === "ACTIVE").length;
  const totalSubmissions = assignments.reduce((sum, a) => sum + (a.submissions?.length ?? 0), 0);
  const graded = assignments.reduce((sum, a) => sum + (a.submissions?.filter((s) => s.score !== null).length ?? 0), 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#d97706] via-[#f59e0b] to-[#fbbf24] px-8 py-10 text-white shadow-[0_24px_60px_rgba(217,119,6,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 4.5, repeat: Infinity }}
            />
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                Assignments
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Assignment Overview</h1>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/88">
                Track all assignments across courses — submissions, grading progress and deadlines.
              </p>
            </div>
          </section>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <AdminStatCard index={0} title="Total" value={loading ? "…" : assignments.length} caption="All assignments in the system." tone="sky" />
          <AdminStatCard index={1} title="Active" value={loading ? "…" : active} caption="Currently accepting submissions." tone="emerald" />
          <AdminStatCard index={2} title="Submissions" value={loading ? "…" : totalSubmissions} caption="Submissions received overall." tone="amber" />
          <AdminStatCard index={3} title="Graded" value={loading ? "…" : graded} caption="Submissions with scores assigned." tone="slate" />
        </StaggerGrid>

        {/* Assignments list */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">All Assignments</h2>
              <p className="mt-1 text-[13px] text-[#667085]">{assignments.length} total</p>
            </div>
            <div className="space-y-3 p-6">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)
              ) : error ? (
                <p className="rounded-[22px] border border-dashed border-[#fecaca] bg-[#fff5f5] px-5 py-12 text-center text-[14px] text-[#dc2626]">
                  ⚠️ {error}
                </p>
              ) : assignments.length === 0 ? (
                <p className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-12 text-center text-[14px] text-[#667085]">
                  No assignments found.
                </p>
              ) : (
                assignments.map((a, i) => (
                  <motion.article
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03, duration: 0.35 }}
                    className="rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#101828]">{a.title}</p>
                        <p className="mt-0.5 text-[13px] text-[#667085]">
                          {a.course?.title ?? "No course"} · {a.points} pts
                          {a.deadline && <span className="ml-2">· Due {formatShortDate(a.deadline)}</span>}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadge[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-[#94a3b8]">
                      <span>{a.submissions?.length ?? 0} submissions</span>
                      <span>{a.submissions?.filter((s) => s.score !== null).length ?? 0} graded</span>
                      <span>Created {formatShortDate(a.createdAt)}</span>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </section>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
