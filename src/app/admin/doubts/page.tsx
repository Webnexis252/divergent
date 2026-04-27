"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatRelativeTime } from "@/lib/date-format";

type Doubt = {
  id: string;
  subject: string;
  body: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CLOSED";
  createdAt: string;
  student: { id: string; name: string | null; email: string | null };
  mentor?: { id: string; name: string | null } | null;
  _count: { replies: number };
};

const priorityBadge = {
  LOW: "bg-[#eefcf3] text-[#15803d]",
  MEDIUM: "bg-[#fff7df] text-[#b45309]",
  HIGH: "bg-[#fff1f2] text-[#dc2626]",
};

const statusBadge = {
  OPEN: "bg-[#eff6ff] text-[#1d4ed8]",
  ASSIGNED: "bg-[#fdf4ff] text-[#7c3aed]",
  RESOLVED: "bg-[#f0fdf4] text-[#15803d]",
  CLOSED: "bg-[#f1f5f9] text-[#64748b]",
};

export default function AdminDoubtsPage() {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [mentors, setMentors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "ASSIGNED" | "RESOLVED" | "CLOSED">("ALL");

  useEffect(() => {
    Promise.all([
      fetch("/api/doubts").then((r) => r.json()),
      fetch("/api/admin/mentors").then((r) => r.json())
    ])
      .then(([doubtsRes, mentorsRes]) => {
        if (doubtsRes.success) setDoubts(doubtsRes.data);
        if (mentorsRes.success) {
          const mentorList = Array.isArray(mentorsRes.data) 
            ? mentorsRes.data 
            : mentorsRes.data?.active || [];
          setMentors(mentorList.map((m: any) => ({ id: m.id, name: m.name })));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleAssignMentor = async (doubtId: string, mentorId: string) => {
    setActionLoading(doubtId);
    try {
      const res = await fetch(`/api/doubts/${doubtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId }),
      });
      if (res.ok) {
        const payload = await res.json();
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? { ...d, status: payload.data.status, mentor: payload.data.mentor || mentors.find(m => m.id === mentorId) } : d)));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (doubtId: string, status: string) => {
    setActionLoading(doubtId);
    try {
      const res = await fetch(`/api/doubts/${doubtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? { ...d, status: status as any } : d)));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === "ALL" ? doubts : doubts.filter((d) => d.status === filter);
  const open = doubts.filter((d) => d.status === "OPEN").length;
  const assigned = doubts.filter((d) => d.status === "ASSIGNED").length;
  const resolved = doubts.filter((d) => d.status === "RESOLVED" || d.status === "CLOSED").length;
  const high = doubts.filter((d) => d.priority === "HIGH" && d.status === "OPEN").length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#dc2626] via-[#ef4444] to-[#f97316] px-8 py-10 text-white shadow-[0_24px_60px_rgba(220,38,38,0.25)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                Support Queue
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Doubt Management</h1>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                All student doubt tickets across the platform. {high > 0 && <span className="font-bold text-[#fde68a]">{high} high-priority tickets need attention.</span>}
              </p>
            </div>
          </section>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <AdminStatCard index={0} title="Open" value={loading ? "…" : open} caption="Awaiting assignment." tone="amber" />
          <AdminStatCard index={1} title="Assigned" value={loading ? "…" : assigned} caption="In progress with mentor." tone="sky" />
          <AdminStatCard index={2} title="Resolved" value={loading ? "…" : resolved} caption="Completed or closed." tone="emerald" />
          <AdminStatCard index={3} title="High Priority" value={loading ? "…" : high} caption="Urgent open tickets." tone="slate" />
        </StaggerGrid>

        {/* Filter tabs + table */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">All Tickets</h2>
              <div className="flex items-center gap-2">
                {(["ALL", "OPEN", "ASSIGNED", "RESOLVED", "CLOSED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      filter === s
                        ? "bg-[#0f172a] text-white"
                        : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 p-6">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)
              ) : filtered.length === 0 ? (
                <p className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-12 text-center text-[14px] text-[#667085]">
                  No tickets in this category.
                </p>
              ) : (
                filtered.map((doubt, i) => (
                  <motion.article
                    key={doubt.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03, duration: 0.35 }}
                    className="rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#101828]">{doubt.subject}</p>
                        <p className="mt-0.5 text-[13px] text-[#667085]">
                          by {doubt.student.name ?? doubt.student.email ?? "Unknown"}
                          {doubt.mentor && <span className="ml-2 text-[#7c3aed]">→ {doubt.mentor.name}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${priorityBadge[doubt.priority]}`}>
                          {doubt.priority}
                        </span>
                        <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${statusBadge[doubt.status]}`}>
                          {doubt.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#f1f5f9] pt-4">
                      <div className="flex items-center gap-4 text-[12px] text-[#94a3b8]">
                        <span>{doubt._count.replies} replies</span>
                        <span>{formatRelativeTime(doubt.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {doubt.status !== "RESOLVED" && doubt.status !== "CLOSED" && (
                          <select
                            className="rounded-md border p-1 text-xs outline-none"
                            value={doubt.mentor?.id || ""}
                            onChange={(e) => handleAssignMentor(doubt.id, e.target.value)}
                            disabled={actionLoading === doubt.id}
                          >
                            <option value="" disabled>Assign Mentor...</option>
                            {mentors.map((m) => (
                              <option key={m.id} value={m.id}>{m.name || 'Unnamed'}</option>
                            ))}
                          </select>
                        )}
                        
                        {doubt.status !== "CLOSED" && doubt.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(doubt.id, "RESOLVED")}
                            disabled={actionLoading === doubt.id}
                            className="rounded-md bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50"
                          >
                            Resolve
                          </button>
                        )}
                        {doubt.status !== "CLOSED" && (
                          <button
                            onClick={() => handleUpdateStatus(doubt.id, "CLOSED")}
                            disabled={actionLoading === doubt.id}
                            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                          >
                            Close
                          </button>
                        )}
                      </div>
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
