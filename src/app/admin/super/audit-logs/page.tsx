"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string | null; role: string };
};

const actionColors: Record<string, string> = {
  COURSE_CREATED: "bg-green-100 text-green-700",
  COURSE_DELETED: "bg-red-100 text-red-700",
  COURSE_UPDATED: "bg-blue-100 text-blue-700",
  STUDENT_SUSPENDED: "bg-orange-100 text-orange-700",
  STUDENT_ACTIVATED: "bg-emerald-100 text-emerald-700",
  PAYMENT_REFUNDED: "bg-purple-100 text-purple-700",
  MENTOR_ASSIGNED_TO_DOUBT: "bg-sky-100 text-sky-700",
  DOUBT_RESOLVED: "bg-teal-100 text-teal-700",
  DOUBT_CLOSED: "bg-slate-100 text-slate-700",
  POST_DELETED: "bg-rose-100 text-rose-700",
  POST_FLAGGED: "bg-amber-100 text-amber-700",
  COHORT_CREATED: "bg-violet-100 text-violet-700",
  USER_ROLE_UPDATED: "bg-indigo-100 text-indigo-700",
};

const entityTypes = ["", "Course", "User", "Payment", "DoubtTicket", "Post", "Cohort"];

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const url = `/api/admin/audit-logs${entityType ? `?entityType=${entityType}` : ""}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(json => { if (json.success) setLogs(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [entityType]);

  const filtered = search
    ? logs.filter(l =>
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.actor.name?.toLowerCase().includes(search.toLowerCase()) ||
        l.entityType.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">

        <RevealSection>
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155] px-8 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.4)]">
            <motion.div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">🔐 Governance</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Audit Logs</h1>
              <p className="mt-2 text-white/70">Complete trail of all administrative actions on the platform.</p>
            </div>
          </div>
        </RevealSection>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, entity..."
            className="flex-1 min-w-[200px] rounded-[12px] border px-4 py-2.5 text-sm outline-none focus:border-[#38c1ff]"
          />
          <select value={entityType} onChange={(e) => setEntityType(e.target.value)}
            className="rounded-[12px] border px-4 py-2.5 text-sm outline-none focus:border-[#38c1ff]"
          >
            {entityTypes.map(t => <option key={t} value={t}>{t || "All Entities"}</option>)}
          </select>
        </div>

        {/* Logs table */}
        <div className="rounded-[24px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="border-b px-6 py-5">
            <h2 className="text-[18px] font-semibold text-[#101828]">
              {filtered.length} Event{filtered.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="divide-y">
            {loading ? (
              <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-[12px] bg-gray-100" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[40px]">📋</p>
                <p className="mt-4 text-[17px] font-semibold text-[#101828]">No audit events found</p>
                <p className="mt-2 text-[13px] text-[#94a3b8]">Administrative actions will appear here as they happen.</p>
              </div>
            ) : (
              filtered.map((log, i) => (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex flex-wrap items-start gap-4 px-6 py-4 hover:bg-gray-50/50 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[14px] font-bold text-slate-600">
                      {log.actor.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${actionColors[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-[13px] font-medium text-[#101828]">{log.actor.name ?? "Unknown"}</span>
                        <span className="text-[12px] text-[#94a3b8]">({log.actor.role})</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-[#94a3b8] truncate">
                        Entity: {log.entityType} · ID: {log.entityId.slice(0, 12)}…
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] text-[#64748b]">
                      {new Date(log.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-[12px] text-[#94a3b8]">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
