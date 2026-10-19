"use client";

import { useEffect, useState } from "react";
import { m as motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { BookOpen, Plus, Users, UsersRound, X } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  adminButton,
  adminInputClass,
  adminLabelClass,
  adminRowClass,
} from "../_components/admin-ui";

type Cohort = {
  id: string;
  name: string;
  courseId: string;
  teacherId: string | null;
  createdAt: string;
  course: { id: string; title: string };
  _count: { students: number };
};

type Course = { id: string; title: string };
type Student = { id: string; name: string | null; email: string | null };

export default function AdminCohortsPage() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    Promise.all([
      fetch("/api/admin/cohorts").then(r => r.json()),
      fetch("/api/admin/courses").then(r => r.json()),
      fetch("/api/admin/students").then(r => r.json()),
    ]).then(([cohortsRes, coursesRes, studentsRes]) => {
      if (cohortsRes.success) setCohorts(cohortsRes.data);
      if (coursesRes.success) { setCourses(coursesRes.data); if (coursesRes.data[0]) setCourseId(coursesRes.data[0].id); }
      if (studentsRes.success) setStudents(studentsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !courseId || selectedStudents.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, courseId, studentIds: selectedStudents }),
      });
      if (res.ok) { setName(""); setSelectedStudents([]); setShowForm(false); load(); }
    } finally { setSubmitting(false); }
  };

  const totalStudents = cohorts.reduce((sum, c) => sum + c._count.students, 0);

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Batch management"
            icon={UsersRound}
            title="Cohorts"
            description="Group students into batches and enroll them in a course in one step."
            actions={
              <button type="button" onClick={() => setShowForm(!showForm)} className={showForm ? adminButton.secondary : adminButton.primary}>
                {showForm ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {showForm ? "Cancel" : "New cohort"}
              </button>
            }
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminStatCard index={0} title="Total cohorts" value={loading ? "…" : cohorts.length} caption="Active batches." icon={<UsersRound />} tone="sky" />
          <AdminStatCard index={1} title="Students batched" value={loading ? "…" : totalStudents} caption="Across all cohorts." icon={<Users />} tone="amber" />
          <AdminStatCard index={2} title="Courses covered" value={loading ? "…" : new Set(cohorts.map(c => c.courseId)).size} caption="Courses with at least one batch." icon={<BookOpen />} tone="emerald" />
        </StaggerGrid>

        {/* Create Cohort Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <AdminPanel>
              <AdminPanelHeader icon={Plus} tone="violet" title="Create new cohort" description="Pick a course, then choose the students to enroll" />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={adminLabelClass}>Cohort name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Spring 2026 CS" className={adminInputClass} />
                </label>
                <label className="block">
                  <span className={adminLabelClass}>Course</span>
                  <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={adminInputClass}>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </label>
              </div>
              <div className="mt-4">
                <p className={adminLabelClass}>Students · {selectedStudents.length} selected</p>
                <div className="max-h-52 space-y-1 overflow-y-auto rounded-[12px] border border-[#e2e8f0] p-2">
                  {students.map(s => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-1.5 transition-colors hover:bg-[#f8fafc]">
                      <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} className="h-4 w-4 rounded accent-[#209bd2]" />
                      <span className="text-[13px] text-[#0f172a]">{s.name ?? "Unknown"} <span className="text-[#94a3b8]">({s.email})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleCreate} disabled={submitting || selectedStudents.length === 0} className={`${adminButton.primary} mt-5`}>
                {submitting ? "Creating…" : `Create cohort & enroll ${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"}`}
              </button>
            </AdminPanel>
          </motion.div>
        )}

        {/* Cohorts List */}
        <AdminPanel>
          <AdminPanelHeader icon={UsersRound} tone="slate" title="All cohorts" description={loading ? "Loading…" : `${cohorts.length} batch${cohorts.length === 1 ? "" : "es"}`} />
          <div className="mt-5 space-y-3">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-[72px] animate-pulse rounded-[16px] bg-[#f1f5f9]" />)
            ) : cohorts.length === 0 ? (
              <AdminEmptyState icon={UsersRound} title="No cohorts yet" description="Create your first batch with New cohort." />
            ) : (
              cohorts.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`${adminRowClass} flex items-center gap-4`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#ede9fe] text-[#6d28d9]"><Users className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#0f172a]">{c.name}</p>
                    <p className="truncate text-[12px] text-[#64748b]">{c.course.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[18px] font-semibold tabular-nums text-[#0f172a]">{c._count.students}</div>
                    <div className="text-[11px] text-[#94a3b8]">students</div>
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
