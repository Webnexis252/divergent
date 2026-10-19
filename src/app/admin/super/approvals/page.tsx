"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { CalendarClock, Check, Download, Trash2, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { m as motion, AnimatePresence } from "motion/react";
import { formatShortDate } from "@/lib/date-format";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButton,
} from "../../_components/admin-ui";
import type { IconTone } from "../../_components/admin-ui";

interface ApprovalRequest {
  id: string;
  type: "CREATE" | "SUSPEND" | "DELETE" | "EXTEND_INSTALLMENT";
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  admin: {
    name: string;
    email: string;
  };
}

type RequestGroupConfig = {
  key: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: IconTone;
  requests: ApprovalRequest[];
  onAction: (id: string, action: "APPROVE" | "REJECT") => void;
  approveLabel: string;
  destructive?: boolean;
  hideContact?: boolean;
};

export default function StudentApprovalsPage() {
  const [studentRequests, setStudentRequests] = useState<ApprovalRequest[]>([]);
  const [teacherRequests, setTeacherRequests] = useState<ApprovalRequest[]>([]);
  const [exportRequests, setExportRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/super-admin/approvals");
      const data = await res.json();
      if (data.success) {
        setStudentRequests(data.data.studentRequests || []);
        setTeacherRequests(data.data.teacherRequests || []);
        setExportRequests(data.data.exportRequests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/super-admin/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setToast({ msg: data.error || `Failed to ${action.toLowerCase()}`, ok: false });
      } else {
        setToast({ msg: data.message, ok: true });
        void fetchRequests();
      }
    } catch (err) {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleExportAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/super-admin/export-approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setToast({ msg: data.error || `Failed to ${action.toLowerCase()} export`, ok: false });
      } else {
        setToast({ msg: data.message, ok: true });
        void fetchRequests();
      }
    } catch (err) {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleTeacherAction = async (id: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch(`/api/super-admin/teacher-approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setToast({ msg: data.error || `Failed to ${action.toLowerCase()} teacher request`, ok: false });
      } else {
        setToast({ msg: data.message, ok: true });
        void fetchRequests();
      }
    } catch (err) {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  const creationRequests = studentRequests.filter(req => req.type === "CREATE");
  const suspensionRequests = studentRequests.filter(req => req.type === "SUSPEND");
  const deletionRequests = studentRequests.filter(req => req.type === "DELETE");
  const extensionRequests = studentRequests.filter(req => req.type === "EXTEND_INSTALLMENT");

  const teacherSuspensionRequests = teacherRequests.filter(req => req.type === "SUSPEND");
  const teacherDeletionRequests = teacherRequests.filter(req => req.type === "DELETE");

  const groups: RequestGroupConfig[] = [
    {
      key: "create",
      title: "Student creation",
      description: "New student accounts requested by admins",
      icon: UserPlus,
      tone: "sky",
      requests: creationRequests,
      onAction: handleAction,
      approveLabel: "Approve",
    },
    {
      key: "suspend",
      title: "Student suspension",
      description: "Accounts admins want to suspend",
      icon: UserX,
      tone: "amber",
      requests: suspensionRequests,
      onAction: handleAction,
      approveLabel: "Approve suspension",
      destructive: true,
    },
    {
      key: "delete",
      title: "Student deletion",
      description: "Permanent account deletions; this can't be undone",
      icon: Trash2,
      tone: "rose",
      requests: deletionRequests,
      onAction: handleAction,
      approveLabel: "Confirm deletion",
      destructive: true,
    },
    {
      key: "extend",
      title: "Installment extensions",
      description: "Requests to push an installment due date",
      icon: CalendarClock,
      tone: "violet",
      requests: extensionRequests,
      onAction: handleAction,
      approveLabel: "Approve extension",
    },
    {
      key: "teacher-suspend",
      title: "Teacher suspension",
      description: "Mentor accounts admins want to suspend",
      icon: UserX,
      tone: "amber",
      requests: teacherSuspensionRequests,
      onAction: handleTeacherAction,
      approveLabel: "Approve suspension",
      destructive: true,
    },
    {
      key: "teacher-delete",
      title: "Teacher deletion",
      description: "Permanent mentor deletions; this can't be undone",
      icon: Trash2,
      tone: "rose",
      requests: teacherDeletionRequests,
      onAction: handleTeacherAction,
      approveLabel: "Confirm deletion",
      destructive: true,
    },
    {
      key: "export",
      title: "Data exports",
      description: "Student data exports awaiting sign-off",
      icon: Download,
      tone: "slate",
      requests: exportRequests,
      onAction: handleExportAction,
      approveLabel: "Approve",
      hideContact: true,
    },
  ];
  const pendingTotal = groups.reduce((sum, g) => sum + g.requests.length, 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Super admin"
            icon={UserCheck}
            title="Admin requests"
            description="Review and approve account, installment and data-export requests raised by administrators."
            actions={
              !loading ? (
                <StatusBadge tone={pendingTotal > 0 ? "warning" : "good"} className="px-3 py-1.5 text-[12px]">
                  {pendingTotal > 0 ? `${pendingTotal} pending` : "All clear"}
                </StatusBadge>
              ) : null
            }
          />
        </RevealSection>

        <RevealSection delay={0.06}>
          {loading ? (
            <div className="space-y-6">
              {[0, 1].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-[24px] bg-white/70">
                  <span className="sr-only">Loading approval requests</span>
                </div>
              ))}
            </div>
          ) : pendingTotal === 0 ? (
            <AdminPanel>
              <AdminEmptyState
                icon={UserCheck}
                title="No pending requests"
                description="There are currently no actions awaiting approval."
              />
            </AdminPanel>
          ) : (
            <div className="space-y-6">
              {groups
                .filter((group) => group.requests.length > 0)
                .map((group) => (
                  <AdminPanel key={group.key}>
                    <AdminPanelHeader
                      icon={group.icon}
                      tone={group.tone}
                      title={group.title}
                      description={group.description}
                      actions={<StatusBadge tone={group.destructive ? "critical" : "info"}>{group.requests.length} pending</StatusBadge>}
                    />
                    <ul className="mt-5 divide-y divide-[#f1f5f9]">
                      {group.requests.map((req) => (
                        <li key={req.id} className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-[#0f172a]">
                              {group.key === "export" ? "Student data export" : req.name}
                            </p>
                            {!group.hideContact && (
                              <p className="mt-0.5 truncate text-[12px] text-[#64748b]">
                                {req.email}
                                {req.phone ? ` · ${req.phone}` : ""}
                              </p>
                            )}
                            <p className="mt-1 text-[12px] text-[#94a3b8]">
                              Requested by {req.admin.name || req.admin.email} · {formatShortDate(req.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={() => group.onAction(req.id, "REJECT")} className={adminButton.secondary}>
                              <X className="h-4 w-4" aria-hidden="true" /> Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => group.onAction(req.id, "APPROVE")}
                              className={group.destructive ? adminButton.destructive : adminButton.primary}
                            >
                              {group.key.endsWith("delete") ? (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              ) : (
                                <Check className="h-4 w-4" aria-hidden="true" />
                              )}
                              {group.approveLabel}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </AdminPanel>
                ))}
            </div>
          )}
        </RevealSection>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-[14px] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)] ${
              toast.ok ? "bg-[#15803d]" : "bg-[#b91c1c]"
            }`}
          >
            {toast.ok ? <Check className="h-4 w-4" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
