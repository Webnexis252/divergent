"use client";

import { useEffect, useState } from "react";
import { m as motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { ClipboardList, History, ScrollText, Search } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminInputClass,
  adminToolbarClass,
} from "../../_components/admin-ui";
import type { StatusTone } from "../../_components/admin-ui";

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string | null; email: string | null; role: string };
};

const actionTones: Record<string, StatusTone> = {
  COURSE_CREATED: "good",
  COURSE_DELETED: "critical",
  COURSE_UPDATED: "info",
  STUDENT_SUSPENDED: "warning",
  STUDENT_ACTIVATED: "good",
  PAYMENT_REFUNDED: "violet",
  MENTOR_ASSIGNED_TO_DOUBT: "info",
  DOUBT_RESOLVED: "good",
  DOUBT_CLOSED: "neutral",
  POST_DELETED: "critical",
  POST_FLAGGED: "warning",
  COHORT_CREATED: "good",
  USER_ROLE_UPDATED: "violet",
};

function actionLabel(action: string) {
  const words = action.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">

        <RevealSection>
          <AdminPageHeader
            eyebrow="Governance"
            icon={ScrollText}
            title="Audit logs"
            description="A complete trail of every administrative action on the platform."
          />
        </RevealSection>

        {/* Filters */}
        <div className={`${adminToolbarClass} grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]`}>
          <label className="relative block">
            <span className="sr-only">Search audit events</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, actor or entity…"
              className={`${adminInputClass} pl-10`}
            />
          </label>
          <label className="block">
            <span className="sr-only">Entity type</span>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className={adminInputClass}>
              {entityTypes.map(t => <option key={t} value={t}>{t || "All entities"}</option>)}
            </select>
          </label>
        </div>

        {/* Logs table */}
        <AdminPanel>
          <AdminPanelHeader
            icon={History}
            tone="slate"
            title="Activity"
            description={`${filtered.length} event${filtered.length !== 1 ? "s" : ""}${search || entityType ? " matching your filters" : ""}`}
          />
          <div className="mt-4 divide-y divide-[#f1f5f9]">
            {loading ? (
              <div className="space-y-3 py-2">{[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse rounded-[12px] bg-[#f1f5f9]" />)}</div>
            ) : filtered.length === 0 ? (
              <AdminEmptyState icon={ClipboardList} title="No audit events found" description="Administrative actions will appear here as they happen." />
            ) : (
              filtered.map((log, i) => (
                <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="flex flex-wrap items-start gap-4 py-3.5"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[13px] font-semibold text-[#334155]">
                      {log.actor.name?.charAt(0) ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={actionTones[log.action] ?? "neutral"}>{actionLabel(log.action)}</StatusBadge>
                        <span className="text-[13px] font-semibold text-[#0f172a]">{log.actor.name ?? "Unknown"}</span>
                        <span className="text-[12px] text-[#94a3b8]">({log.actor.role})</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-[#94a3b8]">
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
        </AdminPanel>
      </div>
    </PageTransition>
  );
}
