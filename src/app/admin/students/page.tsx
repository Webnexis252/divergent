"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Search, Sparkles, Users, Download, UserPlus, UserCheck, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { m as motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  adminButton,
  adminInputClass,
  adminToolbarClass,
} from "../_components/admin-ui";
import { useAuth } from "@/context/auth-context";
import { AddStudentModal } from "./_components/AddStudentModal";
import type { StudentRecord } from "./_types";
import { SetStudentPasswordModal } from "./_components/SetStudentPasswordModal";
import dynamic from "next/dynamic";

const StudentTable = dynamic(() => import("../_components/StudentTable").then(m => m.StudentTable), {
  ssr: false,
});

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [serverStats, setServerStats] = useState({ totalEnrollments: 0, avgXp: 0 });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [setPassStudent, setSetPassStudent] = useState<{ id: string; name: string | null; email: string | null } | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  async function fetchStudents(query = "", pageNum = 1) {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/students?search=${encodeURIComponent(query)}&page=${pageNum}`,
      );
      const payload = await response.json();

      if (payload.success) {
        setStudents(payload.data.students);
        setTotal(payload.data.total || 0);
        setPage(payload.data.page || 1);
        setTotalPages(payload.data.totalPages || 1);
        setServerStats({
          totalEnrollments: payload.data.totalEnrollments || 0,
          avgXp: payload.data.avgXp || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load students", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExportStatus() {
    if (user?.role === "SUPER_ADMIN") {
      setExportStatus("APPROVED");
      return;
    }
    try {
      const response = await fetch("/api/admin/export-requests");
      const payload = await response.json();
      if (payload.success) {
        setExportStatus(payload.status);
      }
    } catch (error) {
      console.error("Failed to load export status", error);
    }
  }

  useEffect(() => {
    void fetchStudents(search, page);
  }, [page]);

  useEffect(() => {
    if (user) {
      void fetchExportStatus();
    }
  }, [user]);

  const handleStatusChange = useCallback(async (studentId: string, status: string, courseId?: string) => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(courseId && { courseId }) }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        setToast({ msg: payload.error ?? "Failed to update status", ok: false });
      } else {
        setToast({ msg: payload.message || "Enrollment status updated", ok: true });
        // Refresh list
        void fetchStudents(search, page);
      }
    } catch {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  }, [search]);

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    if (!confirm("Are you sure you want to request deletion for this student? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        setToast({ msg: payload.error ?? "Failed to delete student", ok: false });
      } else {
        setToast({ msg: payload.message || "Student account deleted", ok: true });
        void fetchStudents(search, page);
      }
    } catch {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  }, [search]);

  const handleXpAdjust = useCallback(
    async (studentId: string, direction: "ADD" | "REMOVE", amount: number) => {
      try {
        const res = await fetch(`/api/admin/students/${studentId}/xp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, amount }),
        });
        const payload = await res.json();

        if (!res.ok || !payload.success) {
          setToast({ msg: payload.error ?? "Failed to update XP", ok: false });
        } else {
          setToast({
            msg:
              payload.message ??
              `${direction === "ADD" ? "Added" : "Removed"} ${amount} XP successfully`,
            ok: true,
          });
          void fetchStudents(search, page);
        }
      } catch {
        setToast({ msg: "Network error", ok: false });
      } finally {
        setTimeout(() => setToast(null), 3500);
      }
    },
    [search],
  );

  const handleBulkXpAdjust = useCallback(
    async (studentIds: string[] | "ALL", direction: "ADD" | "REMOVE", amount: number, note?: string) => {
      try {
        const res = await fetch(`/api/admin/students/bulk-xp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds, direction, amount, note }),
        });
        const payload = await res.json();

        if (!res.ok || !payload.success) {
          setToast({ msg: payload.error ?? "Failed to bulk update XP", ok: false });
        } else {
          setToast({ msg: payload.message ?? "Bulk XP updated successfully", ok: true });
          void fetchStudents(search, page);
        }
      } catch {
        setToast({ msg: "Network error", ok: false });
      } finally {
        setTimeout(() => setToast(null), 3500);
      }
    },
    [search, page]
  );

  const handleExportToExcel = useCallback(async () => {
    if (!students || students.length === 0) {
      setToast({ msg: "No students to export", ok: false });
      return;
    }

    // xlsx 0.18.5 is the last npm release; its open advisories (prototype
    // pollution, ReDoS) are in *reading* spreadsheets. This only writes one.
    const XLSX = await import("xlsx");

    const dataToExport = students.map((student) => ({
      ID: student.id,
      Name: student.name || "N/A",
      Email: student.email || "N/A",
      "XP Points": student.xpPoints,
      "Joined Date": new Date(student.createdAt).toLocaleDateString(),
      "Total Enrollments": student._count.enrollments,
      "Doubts Asked": student._count.createdDoubts,
      "Assignments Submitted": student._count.assignmentSubmissions,
      "Enrolled Courses": student.enrollments.map((e) => `${e.course.title} (${e.status}, ${e.progressPercent}%)`).join("; ")
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

    XLSX.writeFile(workbook, "Students_Export.xlsx");
    
    setToast({ msg: "Export downloaded successfully", ok: true });
  }, [students]);

  const handleExportEnrollmentsCsv = useCallback(async () => {
    try {
      setToast({ msg: "Generating CSV...", ok: true });
      // Call the API endpoint
      const response = await fetch("/api/admin/export/enrollments");
      if (!response.ok) {
        throw new Error("Failed to export");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "learner_enrollments.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setToast({ msg: "Export downloaded successfully", ok: true });
    } catch (error) {
      console.error(error);
      setToast({ msg: "Failed to download export", ok: false });
    }
  }, []);

  const handleRequestExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/admin/export-requests", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToast({ msg: data.error || "Failed to request export", ok: false });
      } else {
        setToast({ msg: "Export request submitted", ok: true });
        void fetchExportStatus();
      }
    } catch {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setExportLoading(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const stats = useMemo(() => {
    return {
      avgXp: serverStats.avgXp,
      enrollmentCount: serverStats.totalEnrollments,
      totalStudents: total,
    };
  }, [serverStats, total]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    void fetchStudents(search, 1);
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Student management"
            icon={Users}
            title="Students"
            description="Search by name or email, scan the key numbers first, then open a student for course-level detail."
            actions={
              <>
                {user?.role === "SUPER_ADMIN" && (
                  <Link href="/admin/super/approvals" className={adminButton.secondary}>
                    <UserCheck className="h-4 w-4" aria-hidden="true" />
                    Approvals
                  </Link>
                )}
                <button type="button" onClick={() => setIsAddModalOpen(true)} className={adminButton.primary}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Add student
                </button>
              </>
            }
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminStatCard index={0} title="Students" value={stats.totalStudents} caption="Learners in the current directory view." icon={<Users />} tone="sky" />
          <AdminStatCard index={1} title="Enrollments" value={stats.enrollmentCount} caption="Course seats held by the students in view." icon={<GraduationCap />} tone="emerald" />
          <AdminStatCard index={2} title="Average XP" value={stats.avgXp} caption="A quick read on learner momentum." icon={<Sparkles />} tone="amber" />
        </StaggerGrid>

        <RevealSection delay={0.04} className="relative z-10">
          <div className={`${adminToolbarClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
            <form className="relative w-full lg:max-w-md" onSubmit={handleSearch} role="search">
              <label htmlFor="student-search" className="sr-only">Search students</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
              <input
                id="student-search"
                className={`${adminInputClass} pl-10`}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email, then press Enter"
                type="text"
                value={search}
              />
            </form>
            <div className="flex flex-wrap items-center gap-2">
              {exportStatus === "APPROVED" ? (
                <>
                  <button onClick={handleExportToExcel} className={adminButton.secondary} type="button">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export students
                  </button>
                  <button onClick={handleExportEnrollmentsCsv} className={adminButton.secondary} type="button">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Export enrollments (CSV)
                  </button>
                </>
              ) : exportStatus === "PENDING" ? (
                <button className={adminButton.secondary} type="button" disabled>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export pending approval
                </button>
              ) : (
                <button className={adminButton.secondary} type="button" onClick={handleRequestExport} disabled={exportLoading}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Request export approval
                </button>
              )}
            </div>
          </div>
        </RevealSection>

        <RevealSection delay={0.06}>
          {loading ? (
            <div className="h-96 animate-pulse rounded-[24px] bg-white/70">
              <span className="sr-only">Loading students</span>
            </div>
          ) : students.length === 0 ? (
            <AdminPanel>
              <AdminEmptyState
                icon={Users}
                title="No students found"
                description="No students matched the current search. Try a broader name or email."
              />
            </AdminPanel>
          ) : (
            <>
              <StudentTable
                canManageXp={user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"}
                onXpAdjust={handleXpAdjust}
                onBulkXpAdjust={handleBulkXpAdjust}
                onStatusChange={handleStatusChange}
                onDelete={handleDeleteStudent}
                onSetPassword={(id) => {
                  const s = students.find((st) => st.id === id);
                  if (s) setSetPassStudent({ id, name: s.name, email: s.email });
                }}
                students={students}
                totalStudents={total}
              />
              <div className="mt-4 flex items-center justify-end gap-4 text-[12px] font-medium text-[#64748b]">
                <span>
                  {students.length > 0 ? (page - 1) * 20 + 1 : 0}–
                  {Math.min(page * 20, total)} of {total}
                </span>
                <div className="flex gap-2">
                  <button
                    className="grid h-8 w-8 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    title="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    className="grid h-8 w-8 place-items-center rounded-[10px] border border-[#e2e8f0] bg-white text-[#475569] transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    title="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
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

      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        isSuperAdmin={user?.role === "SUPER_ADMIN"}
        onSuccess={(msg) => {
          setToast({ msg, ok: true });
          void fetchStudents(search, page);
        }}
      />

      <AnimatePresence>
        {setPassStudent && (
          <SetStudentPasswordModal
            studentId={setPassStudent.id}
            studentName={setPassStudent.name}
            studentEmail={setPassStudent.email}
            onClose={() => setSetPassStudent(null)}
            onSuccess={() => setToast({ msg: "Password set successfully.", ok: true })}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
