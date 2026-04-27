"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GraduationCap, Search, Sparkles, Users, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { useAuth } from "@/context/auth-context";
import type { StudentRecord } from "./_types";
import dynamic from "next/dynamic";

const StudentTable = dynamic(() => import("../_components/StudentTable").then(m => m.StudentTable), {
  ssr: false,
});

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  async function fetchStudents(query = "") {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/students?search=${encodeURIComponent(query)}`,
      );
      const payload = await response.json();

      if (payload.success) {
        setStudents(payload.data.students);
      }
    } catch (error) {
      console.error("Failed to load students", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchStudents();
  }, []);

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
        setToast({ msg: "Enrollment status updated", ok: true });
        // Refresh list
        void fetchStudents(search);
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
          void fetchStudents(search);
        }
      } catch {
        setToast({ msg: "Network error", ok: false });
      } finally {
        setTimeout(() => setToast(null), 3500);
      }
    },
    [search],
  );

  const handleExportToExcel = useCallback(async () => {
    if (!students || students.length === 0) {
      setToast({ msg: "No students to export", ok: false });
      return;
    }

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

  const stats = useMemo(() => {
    const enrollmentCount = students.reduce(
      (count, student) => count + student._count.enrollments,
      0,
    );
    const totalXp = students.reduce((count, student) => count + student.xpPoints, 0);
    const avgXp = students.length > 0 ? Math.round(totalXp / students.length) : 0;

    return {
      avgXp,
      enrollmentCount,
      totalStudents: students.length,
    };
  }, [students]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void fetchStudents(search);
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        <RevealSection>
          <Surface className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[32%] bg-[radial-gradient(circle_at_center,rgba(56,193,255,0.14),transparent_72%)]" />
            <div className="relative z-10 space-y-8">
              <SectionHeading
                eyebrow="Student Management"
                title="A cleaner operating view of the learner base."
                description="Search by name or email, scan the highest-value numbers first, and expand into course-level detail without the screen feeling like internal tooling."
              />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <form className="relative w-full max-w-xl" onSubmit={handleSearch}>
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-subtle)]" />
                  <input
                    className="h-14 w-full rounded-[var(--radius-pill)] border border-[var(--line-soft)] bg-white/88 pl-12 pr-5 text-[15px] text-[var(--text-strong)] shadow-[var(--shadow-soft)] transition-[border-color,box-shadow] duration-[var(--transition-fast)] ease-[var(--ease-standard)] focus-visible:border-[var(--brand-primary-strong)] focus-visible:outline-none"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search students by name or email"
                    type="text"
                    value={search}
                  />
                </form>
                <Button onClick={handleExportToExcel} variant="secondary" size="lg" className="shrink-0" type="button">
                  <Download className="h-[18px] w-[18px]" />
                  Export to Excel
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  accent="var(--brand-primary-strong)"
                  icon={<Users className="h-5 w-5" />}
                  label="Students"
                  meta="Learners currently visible in the filtered directory."
                  value={stats.totalStudents}
                />
                <MetricCard
                  accent="var(--success)"
                  icon={<GraduationCap className="h-5 w-5" />}
                  label="Enrollments"
                  meta="Total course seats attached to the students in view."
                  value={stats.enrollmentCount}
                />
                <MetricCard
                  accent="var(--warning)"
                  icon={<Sparkles className="h-5 w-5" />}
                  label="Average XP"
                  meta="A quick read on learner momentum across the filtered cohort."
                  value={stats.avgXp}
                />
              </div>
            </div>
          </Surface>
        </RevealSection>

        <RevealSection delay={0.06}>
          {loading ? (
            <Surface className="h-96 animate-pulse">
              <span className="sr-only">Loading students</span>
            </Surface>
          ) : students.length === 0 ? (
            <EmptyState
              description="No students matched the current search. Try a broader name or email query to repopulate the directory."
              icon={<Users className="h-6 w-6" />}
              title="No students found"
            />
          ) : (
            <StudentTable
              canManageXp={user?.role === "SUPER_ADMIN"}
              onXpAdjust={handleXpAdjust}
              onStatusChange={handleStatusChange}
              students={students}
            />
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
