"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";

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
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-10 lg:px-10">

        <RevealSection>
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#38c1ff] px-8 py-10 text-white shadow-[0_24px_60px_rgba(124,58,237,0.25)]">
            <motion.div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 5, repeat: Infinity }} />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest">Batch Management</div>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight">Cohorts</h1>
                <p className="mt-2 text-white/80">Group students into batches and enroll them in courses with one click.</p>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setShowForm(!showForm)}
                className="rounded-[14px] bg-white/20 px-5 py-2.5 font-semibold backdrop-blur-sm"
              >
                {showForm ? "✕ Cancel" : "+ New Cohort"}
              </motion.button>
            </div>
          </div>
        </RevealSection>

        <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-3">
          <AdminStatCard index={0} title="Total Cohorts" value={loading ? "…" : cohorts.length} caption="Active batches." tone="sky" />
          <AdminStatCard index={1} title="Students Batched" value={loading ? "…" : totalStudents} caption="Across all cohorts." tone="amber" />
          <AdminStatCard index={2} title="Courses Covered" value={loading ? "…" : new Set(cohorts.map(c => c.courseId)).size} caption="Courses with batches." tone="emerald" />
        </StaggerGrid>

        {/* Create Cohort Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] bg-white p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.08)]">
            <h2 className="mb-5 text-[18px] font-semibold text-[#101828]">Create New Cohort</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Cohort name (e.g., Spring 2026 CS)" className="rounded-[12px] border px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed]" />
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-[12px] border px-4 py-2.5 text-sm outline-none focus:border-[#7c3aed]">
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-[13px] font-medium text-[#101828]">Select Students ({selectedStudents.length} selected)</p>
              <div className="max-h-52 overflow-y-auto space-y-2 rounded-[12px] border p-3">
                {students.map(s => (
                  <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} className="h-4 w-4 rounded accent-[#7c3aed]" />
                    <span className="text-[13px] text-[#101828]">{s.name ?? "Unknown"} <span className="text-[#94a3b8]">({s.email})</span></span>
                  </label>
                ))}
              </div>
            </div>
            <motion.button onClick={handleCreate} disabled={submitting || selectedStudents.length === 0} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="mt-4 rounded-[12px] bg-[#7c3aed] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Creating..." : `Create Cohort & Enroll ${selectedStudents.length} Students`}
            </motion.button>
          </motion.div>
        )}

        {/* Cohorts List */}
        <div className="rounded-[28px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <div className="border-b px-6 py-5">
            <h2 className="text-[18px] font-semibold text-[#101828]">All Cohorts</h2>
          </div>
          <div className="p-6 space-y-3">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-[16px] bg-gray-100" />)
            ) : cohorts.length === 0 ? (
              <p className="py-12 text-center text-[#94a3b8]">No cohorts yet. Create your first batch!</p>
            ) : (
              cohorts.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-4 rounded-[16px] border border-[#f1f5f9] bg-[#fafafa] px-5 py-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-purple-100 text-[22px]">👥</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#101828]">{c.name}</p>
                    <p className="text-[13px] text-[#94a3b8]">{c.course.title}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[20px] font-bold text-[#7c3aed]">{c._count.students}</div>
                    <div className="text-[12px] text-[#94a3b8]">students</div>
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
