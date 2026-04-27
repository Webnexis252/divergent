"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { AdminStatCard } from "../_components/AdminStatCard";
import {
  AnimStat,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import {
  BookOpenIcon,
  GraduationCapIcon,
  MessageSquareIcon,
  UsersIcon,
} from "../_components/admin-icons";
import { formatRelativeTime } from "@/lib/date-format";
import type { AdminOverviewData } from "./_types";

const priorityTone: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/overview")
      .then((res) => res.json())
      .then((payload) => {
        if (active && payload.success) {
          setData(payload.data);
        }
      })
      .catch(() => {
        // Silently handle — dev overlay picks up console.error
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        <div className="h-40 animate-pulse rounded-[32px] bg-white/70" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[28px] bg-white/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="h-96 animate-pulse rounded-[30px] bg-white/70" />
          <div className="h-96 animate-pulse rounded-[30px] bg-white/70" />
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const totalStudents = kpis?.totalStudents ?? 0;
  const activeEnrollments = kpis?.activeEnrollments ?? 0;
  const openDoubts = kpis?.openDoubts ?? 0;
  const publishedCourses = kpis?.publishedCourses ?? 0;
  const newStudentsThisWeek = kpis?.newStudentsThisWeek ?? 0;

  const enrollmentIntensity = totalStudents
    ? Math.round((activeEnrollments / totalStudents) * 100)
    : 0;
  const supportLoad = totalStudents ? Math.round((openDoubts / totalStudents) * 100) : 0;
  const courseCoverage = publishedCourses
    ? Math.round(activeEnrollments / Math.max(publishedCourses, 1))
    : 0;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        <RevealSection>
          <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(135deg,#062f4f_0%,#0c4f78_38%,#38c1ff_100%)] px-8 py-8 text-white shadow-[0_30px_70px_rgba(7,89,133,0.28)] sm:px-10">
            <div className="absolute inset-y-0 right-0 w-[36%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_62%)]" />
            <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] lg:items-end">
              <div>
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/88 backdrop-blur">
                  Platform Snapshot
                </div>
                <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-[3.4rem]">
                  Platform Overview
                </h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/78 sm:text-base">
                  A high-signal view of learner growth, course activity, and support demand
                  so the team can spot movement quickly without digging through separate tools.
                </p>
              </div>

              <div className="grid gap-4 rounded-[28px] border border-white/14 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.22em] text-white/65">
                      This Week
                    </p>
                    <AnimStat className="mt-3 text-[54px] font-semibold leading-none tracking-[-0.06em] text-[#fde68a]">
                      {newStudentsThisWeek}
                    </AnimStat>
                  </div>
                  <div className="rounded-2xl bg-white/12 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
                      Enrollment Intensity
                    </p>
                    <p className="mt-2 text-xl font-semibold">{enrollmentIntensity}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-white/78">
                  <div className="rounded-2xl bg-black/10 px-4 py-3">
                    <p className="text-white/55">Support load</p>
                    <p className="mt-2 text-lg font-semibold text-white">{supportLoad}%</p>
                  </div>
                  <div className="rounded-2xl bg-black/10 px-4 py-3">
                    <p className="text-white/55">Learners per course</p>
                    <p className="mt-2 text-lg font-semibold text-white">{courseCoverage}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            index={0}
            title="Total Students"
            value={totalStudents}
            trend={`+${newStudentsThisWeek} this week`}
            caption="Current active student roster across the LMS."
            icon={<UsersIcon className="h-5 w-5" />}
            tone="sky"
          />
          <AdminStatCard
            index={1}
            title="Active Enrollments"
            value={activeEnrollments}
            caption="Students currently moving through course content."
            icon={<GraduationCapIcon className="h-5 w-5" />}
            tone="emerald"
          />
          <AdminStatCard
            index={2}
            title="Open Doubts"
            value={openDoubts}
            caption="Learner questions still waiting on mentor action."
            icon={<MessageSquareIcon className="h-5 w-5" />}
            tone="amber"
          />
          <AdminStatCard
            index={3}
            title="Published Courses"
            value={publishedCourses}
            caption="Courses currently visible and enrollable on the platform."
            icon={<BookOpenIcon className="h-5 w-5" />}
            tone="slate"
          />
        </StaggerGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
          <RevealSection>
            <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                    Enrollments
                  </p>
                  <h2 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                    Recent student momentum
                  </h2>
                </div>
                <p className="text-sm text-[#64748b]">Most recent joins across the last 7 days.</p>
              </div>

              <div className="mt-6 space-y-3">
                {data?.recentEnrollments?.length ? (
                  data.recentEnrollments.map((enrollment, index) => (
                    <motion.article
                      key={`${enrollment.studentEmail}-${index}`}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-40px" }}
                      transition={{ delay: index * 0.05, duration: 0.35 }}
                      whileHover={{ x: 5 }}
                      className="flex flex-col gap-4 rounded-[24px] border border-[#eef2f7] bg-[#fbfdff] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#d9f4ff_0%,#effbff_100%)] text-sm font-bold text-[#0284c7]">
                          {(enrollment.studentName ?? enrollment.studentEmail ?? "S").slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0f172a]">
                            {enrollment.studentName ?? "Unnamed student"}
                          </p>
                          <p className="text-sm text-[#64748b]">{enrollment.courseTitle}</p>
                        </div>
                      </div>
                      <div className="text-sm text-[#64748b]">
                        {formatRelativeTime(enrollment.createdAt)}
                      </div>
                    </motion.article>
                  ))
                ) : (
                  <p className="rounded-[24px] border border-dashed border-[#d8e3ef] px-5 py-10 text-center text-[#64748b]">
                    No recent enrollments.
                  </p>
                )}
              </div>
            </section>
          </RevealSection>

          <div className="space-y-6">
            <RevealSection>
              <section className="rounded-[30px] border border-white/70 bg-white/95 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#94a3b8]">
                  Support Queue
                </p>
                <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-[#0f172a]">
                  Open doubts
                </h2>

                <div className="mt-6 space-y-3">
                  {data?.recentDoubts?.length ? (
                    data.recentDoubts.map((doubt, index) => (
                      <motion.article
                        key={doubt.id}
                        initial={{ opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ delay: index * 0.05, duration: 0.35 }}
                        className="rounded-[22px] border border-[#eef2f7] bg-[#fbfdff] px-4 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#0f172a]">{doubt.subject}</p>
                            <p className="mt-1 text-sm text-[#64748b]">
                              by {doubt.studentName ?? "Unknown student"}
                            </p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${priorityTone[doubt.priority]}`}>
                            {doubt.priority}
                          </span>
                        </div>
                        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#94a3b8]">
                          {formatRelativeTime(doubt.createdAt)}
                        </p>
                      </motion.article>
                    ))
                  ) : (
                    <p className="rounded-[24px] border border-dashed border-[#d8e3ef] px-5 py-10 text-center text-[#64748b]">
                      All doubts answered.
                    </p>
                  )}
                </div>
              </section>
            </RevealSection>

            <RevealSection delay={0.08}>
              <section className="rounded-[30px] border border-white/70 bg-[#0f172a] p-6 text-white shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/45">
                  Operations Snapshot
                </p>
                <div className="mt-5 space-y-5">
                  {[
                    {
                      label: "Enrollment intensity",
                      value: enrollmentIntensity,
                      color: "bg-[#38c1ff]",
                    },
                    {
                      label: "Support load",
                      value: supportLoad,
                      color: "bg-[#fbbf24]",
                    },
                    {
                      label: "Courses in demand",
                      value: Math.min(courseCoverage * 8, 100),
                      color: "bg-[#34d399]",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between text-sm text-white/72">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className={`h-full rounded-full ${item.color}`}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${item.value}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </RevealSection>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
