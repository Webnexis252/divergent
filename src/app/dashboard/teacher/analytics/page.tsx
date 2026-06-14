"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { TeacherSidebar } from "@/app/dashboard/_components/teacher-sidebar";
import Image from "next/image";

type Student = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  progress: number;
  lastActive: string;
  passRate: number | null;
  submittedCount: number;
  examScore: number | null;
  isAtRisk: boolean;
  riskReasons: string[];
};

type Analytics = {
  totalStudents: number;
  completedCount: number;
  avgProgress: number;
  atRiskCount: number;
  students: Student[];
  atRiskStudents: Student[];
};

export default function TeacherAnalyticsPage() {
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "at-risk">("all");

  useEffect(() => {
    fetch("/api/teacher/courses")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setCourses(json.data);
          setSelectedCourse(json.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!selectedCourse) return;
    
    // We update state inside an async IIFE or inside a microtask 
    // to prevent synchronous cascading renders from React's perspective
    queueMicrotask(() => setLoading(true));

    fetch(`/api/teacher/analytics/${selectedCourse}`)
      .then((r) => r.json())
      .then((json) => {
        if (!ignore && json.success) setAnalytics(json.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoading(false);
      });
      
    return () => { ignore = true; };
  }, [selectedCourse]);

  const displayed = tab === "all" ? analytics?.students ?? [] : analytics?.atRiskStudents ?? [];

  return (
    <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <TeacherSidebar />
          <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1200px] space-y-8">

              {/* Hero */}
              <RevealSection>
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#7c3aed] to-[#38c1ff] px-8 py-10 text-white shadow-[0_20px_50px_rgba(124,58,237,0.25)]">
                  <motion.div className="pointer-events-none absolute -right-16 -bottom-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 5, repeat: Infinity }} />
                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
                    <div>
                      <div className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest">Cohort Analytics</div>
                      <h1 className="mt-4 text-[32px] font-semibold tracking-tight">Student Performance</h1>
                      {analytics && (
                        <p className="mt-2 text-white/80">{analytics.atRiskCount} at-risk students detected across {analytics.totalStudents} enrolled.</p>
                      )}
                    </div>
                    {courses.length > 0 && (
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="rounded-[14px] bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm outline-none cursor-pointer"
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id} className="text-black">{c.title}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </RevealSection>

              {/* Stats */}
              {analytics && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[
                    { label: "Total Enrolled", value: analytics.totalStudents, emoji: "👥" },
                    { label: "Completed",       value: analytics.completedCount, emoji: "✅" },
                    { label: "Avg. Progress",   value: `${analytics.avgProgress}%`, emoji: "📊" },
                    { label: "At-Risk",         value: analytics.atRiskCount,  emoji: "⚠️" },
                  ].map((s, i) => (
                    <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                      className="rounded-[20px] bg-white p-5 shadow-[0px_4px_12px_rgba(0,0,0,0.06)]"
                    >
                      <div className="text-2xl">{s.emoji}</div>
                      <div className="mt-2 text-[28px] font-bold text-[#101828]">{s.value}</div>
                      <div className="text-[13px] text-[#64748b]">{s.label}</div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Student Table */}
              <div className="rounded-[24px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between border-b px-6 py-5">
                  <h2 className="text-[18px] font-semibold text-[#101828]">Students</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setTab("all")} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${tab === "all" ? "bg-[#7c3aed] text-white" : "bg-gray-100 text-gray-600"}`}>All</button>
                    <button onClick={() => setTab("at-risk")} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${tab === "at-risk" ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                      At-Risk {analytics ? `(${analytics.atRiskCount})` : ""}
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
                  ) : displayed.length === 0 ? (
                    <p className="py-12 text-center text-[#94a3b8]">{tab === "at-risk" ? "🎉 No at-risk students! Great job." : "No students found."}</p>
                  ) : (
                    <div className="space-y-3">
                      {displayed.map((s, i) => (
                        <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className={`flex flex-wrap items-center gap-4 rounded-[16px] border px-5 py-4 ${s.isAtRisk ? "border-red-200 bg-red-50/50" : "border-gray-100 bg-gray-50/30"}`}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {s.image ? <Image src={s.image} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" /> :
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7c3aed] text-white font-bold">{s.name?.charAt(0) ?? '?'}</div>}
                            <div className="min-w-0">
                              <p className="font-semibold text-[#101828] truncate">{s.name ?? "Unknown"}</p>
                              <p className="text-[12px] text-[#94a3b8] truncate">{s.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-[13px]">
                            <div className="text-center">
                              <div className="font-bold text-[#101828]">{Math.round(s.progress)}%</div>
                              <div className="text-[#94a3b8]">Progress</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-[#101828]">{s.passRate !== null ? `${Math.round(s.passRate)}%` : "—"}</div>
                              <div className="text-[#94a3b8]">Quiz Rate</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-[#101828]">{s.examScore !== null ? `${Math.round(s.examScore)}%` : "—"}</div>
                              <div className="text-[#94a3b8]">Exam Score</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-[#101828]">{s.submittedCount}</div>
                              <div className="text-[#94a3b8]">Submitted</div>
                            </div>
                          </div>
                          {s.isAtRisk && (
                            <div className="flex gap-1.5 flex-wrap">
                              {s.riskReasons.map((r) => (
                                <span key={r} className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">{r}</span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
    </PageTransition>
  );
}
