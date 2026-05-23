"use client";

import { useEffect, useState } from "react";
import { Check, X, UserCheck } from "lucide-react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";

interface ApprovalRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  admin: {
    name: string;
    email: string;
  };
}

export default function StudentApprovalsPage() {
  const [studentRequests, setStudentRequests] = useState<ApprovalRequest[]>([]);
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

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <Surface className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[32%] bg-[radial-gradient(circle_at_center,rgba(56,193,255,0.14),transparent_72%)]" />
            <div className="relative z-10">
              <SectionHeading
                eyebrow="Super Admin"
                title="Student Approvals"
                description="Review and approve students manually added by administrators."
              />
            </div>
          </Surface>
        </RevealSection>

        <RevealSection delay={0.06}>
          {loading ? (
            <Surface className="h-64 animate-pulse">
              <span className="sr-only">Loading approval requests</span>
            </Surface>
          ) : (studentRequests.length === 0 && exportRequests.length === 0) ? (
            <EmptyState
              icon={<UserCheck className="h-6 w-6" />}
              title="No pending requests"
              description="There are currently no students or exports awaiting approval."
            />
          ) : (
            <div className="space-y-8">
              {studentRequests.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 px-1">Student Creation Requests</h2>
                  {studentRequests.map((req) => (
                    <Surface key={req.id} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{req.name}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span>Email: {req.email}</span>
                            {req.phone && <span>Phone: {req.phone}</span>}
                          </div>
                          <div className="mt-2 text-xs font-medium text-gray-400">
                            Requested by: {req.admin.name || req.admin.email} • {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="secondary"
                            onClick={() => handleAction(req.id, "REJECT")}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <Button
                            onClick={() => handleAction(req.id, "APPROVE")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        </div>
                      </div>
                    </Surface>
                  ))}
                </div>
              )}

              {exportRequests.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 px-1">Data Export Requests</h2>
                  {exportRequests.map((req) => (
                    <Surface key={req.id} className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Student Data Export</h3>
                          <div className="mt-2 text-xs font-medium text-gray-400">
                            Requested by: {req.admin.name || req.admin.email} • {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Button
                            variant="secondary"
                            onClick={() => handleExportAction(req.id, "REJECT")}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <Button
                            onClick={() => handleExportAction(req.id, "APPROVE")}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        </div>
                      </div>
                    </Surface>
                  ))}
                </div>
              )}
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
            className={`fixed bottom-6 right-6 z-50 rounded-2xl px-5 py-3 text-[14px] font-semibold text-white shadow-xl ${
              toast.ok ? "bg-[#15803d]" : "bg-[#dc2626]"
            }`}
          >
            {toast.ok ? "✓" : "✗"} {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
