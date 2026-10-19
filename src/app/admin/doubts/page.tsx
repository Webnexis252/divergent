"use client";

import { useEffect, useState } from "react";
import { m as motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { formatRelativeTime } from "@/lib/date-format";
import { AlertTriangle, ArrowUpRight, CircleCheck, Inbox, MessageSquare, UserCheck } from "lucide-react";
import { SegmentedControl } from "@/app/dashboard/_components/segmented-control";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButtonSm,
  adminRowClass,
} from "../_components/admin-ui";
import type { StatusTone } from "../_components/admin-ui";

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
  attachmentUrl?: string | null;
};

const priorityTone: Record<string, StatusTone> = {
  LOW: "good",
  MEDIUM: "warning",
  HIGH: "critical",
};

const statusTone: Record<string, StatusTone> = {
  OPEN: "info",
  ASSIGNED: "violet",
  RESOLVED: "good",
  CLOSED: "neutral",
};

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

const FILTERS = ["ALL", "OPEN", "ASSIGNED", "RESOLVED", "CLOSED"] as const;

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
          setMentors(mentorList.map((m: { id: string; name: string | null }) => ({ id: m.id, name: m.name })));
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
        setDoubts((prev) => prev.map((d) => (d.id === doubtId ? { ...d, status: status as Doubt["status"] } : d)));
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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Support queue"
            icon={MessageSquare}
            title="Doubt management"
            description="Every student doubt ticket across the platform: assign mentors, resolve and close."
            actions={
              !loading && high > 0 ? (
                <StatusBadge tone="critical" icon={AlertTriangle} className="px-3 py-1.5 text-[12px]">
                  {high} high-priority open
                </StatusBadge>
              ) : null
            }
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard index={0} title="Open" value={loading ? "…" : open} caption="Awaiting assignment." icon={<Inbox />} tone="amber" />
          <AdminStatCard index={1} title="Assigned" value={loading ? "…" : assigned} caption="In progress with a mentor." icon={<UserCheck />} tone="sky" />
          <AdminStatCard index={2} title="Resolved" value={loading ? "…" : resolved} caption="Completed or closed." icon={<CircleCheck />} tone="emerald" />
          <AdminStatCard index={3} title="High priority" value={loading ? "…" : high} caption="Urgent open tickets." icon={<AlertTriangle />} tone="rose" />
        </StaggerGrid>

        <RevealSection>
          <AdminPanel>
            <AdminPanelHeader
              icon={MessageSquare}
              tone="sky"
              title="All tickets"
              description={loading ? "Loading…" : `${filtered.length} ticket${filtered.length === 1 ? "" : "s"}${filter === "ALL" ? "" : ` · ${titleCase(filter)}`}`}
              actions={
                <SegmentedControl
                  size="sm"
                  ariaLabel="Filter tickets by status"
                  value={filter}
                  onChange={setFilter}
                  options={FILTERS.map((f) => ({ id: f, label: f === "ALL" ? "All" : titleCase(f) }))}
                  className="max-w-full overflow-x-auto"
                />
              }
            />

            <div className="mt-5 space-y-3">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-[16px] bg-[#f1f5f9]" />)
              ) : filtered.length === 0 ? (
                <AdminEmptyState icon={Inbox} title="No tickets here" description="Nothing in this category right now." />
              ) : (
                filtered.map((doubt, i) => (
                  <motion.article
                    key={doubt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                    className={adminRowClass}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#0f172a]">{doubt.subject}</p>
                        <p className="mt-0.5 text-[12px] text-[#64748b]">
                          by {doubt.student.name ?? doubt.student.email ?? "Unknown"}
                          {doubt.mentor && <span className="ml-1.5 text-[#6d28d9]">→ {doubt.mentor.name}</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge tone={priorityTone[doubt.priority] ?? "neutral"}>{titleCase(doubt.priority)}</StatusBadge>
                        <StatusBadge tone={statusTone[doubt.status] ?? "neutral"}>{titleCase(doubt.status)}</StatusBadge>
                      </div>
                    </div>
                    {doubt.attachmentUrl && (
                      <a href={doubt.attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#0369a1] hover:underline">
                        View attachment <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#f1f5f9] pt-3">
                      <div className="flex items-center gap-3 text-[12px] text-[#94a3b8]">
                        <span>{doubt._count.replies} replies</span>
                        <span>{formatRelativeTime(doubt.createdAt)}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {doubt.status !== "RESOLVED" && doubt.status !== "CLOSED" && (
                          <select
                            aria-label="Assign mentor"
                            className="h-8 rounded-[10px] border border-[#e2e8f0] bg-white px-2.5 text-[12px] text-[#334155] outline-none transition-colors hover:border-[#cbd5e1] focus:border-[#209bd2] focus:ring-2 focus:ring-[#38c1ff]/20"
                            value={doubt.mentor?.id || ""}
                            onChange={(e) => handleAssignMentor(doubt.id, e.target.value)}
                            disabled={actionLoading === doubt.id}
                          >
                            <option value="" disabled>Assign mentor…</option>
                            {mentors.map((m) => (
                              <option key={m.id} value={m.id}>{m.name || 'Unnamed'}</option>
                            ))}
                          </select>
                        )}

                        {doubt.status !== "CLOSED" && doubt.status !== "RESOLVED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(doubt.id, "RESOLVED")}
                            disabled={actionLoading === doubt.id}
                            className={adminButtonSm.primary}
                          >
                            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Resolve
                          </button>
                        )}
                        {doubt.status !== "CLOSED" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(doubt.id, "CLOSED")}
                            disabled={actionLoading === doubt.id}
                            className={adminButtonSm.secondary}
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
          </AdminPanel>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
