"use client";

import { useEffect, useState } from "react";
import { m as motion } from "motion/react";
import { AdminStatCard } from "../_components/AdminStatCard";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
} from "../_components/admin-ui";
import type { StatusTone } from "../_components/admin-ui";
import { CircleCheck, Gauge, LayoutDashboard, MessageCircleQuestion, UserPlus } from "lucide-react";
import {
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

const priorityTone: Record<string, StatusTone> = {
  LOW: "good",
  MEDIUM: "warning",
  HIGH: "critical",
};

/**
 * Admin overview. The server page passes `initialData` so the KPIs render on
 * first paint; without it (prefetch failed) the page fetches them itself.
 */
export default function AdminOverview({
  initialData = null,
}: {
  initialData?: AdminOverviewData | null;
}) {
  const [data, setData] = useState<AdminOverviewData | null>(initialData);
  const [loading, setLoading] = useState(initialData === null);

  useEffect(() => {
    if (initialData) return;
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
  }, [initialData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <div className="h-28 animate-pulse rounded-[24px] bg-white/70" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[168px] animate-pulse rounded-[20px] bg-white/70" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
          <div className="h-96 animate-pulse rounded-[24px] bg-white/70" />
          <div className="h-96 animate-pulse rounded-[24px] bg-white/70" />
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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Platform snapshot"
            icon={LayoutDashboard}
            title="Platform overview"
            description="Learner growth, course activity and support demand in one view, so the team can spot movement without digging through separate tools."
            actions={
              <div className="flex items-center gap-3 rounded-[16px] border border-[#e8edf3] bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#ecfdf3] text-[#15803d]">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[11px] font-medium text-[#64748b]">New students this week</p>
                  <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em] text-[#0f172a]">
                    {newStudentsThisWeek}
                  </p>
                </div>
              </div>
            }
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            index={0}
            title="Total students"
            value={totalStudents}
            trend={`+${newStudentsThisWeek} this week`}
            caption="Current active student roster across the LMS."
            icon={<UsersIcon className="h-5 w-5" />}
            tone="sky"
          />
          <AdminStatCard
            index={1}
            title="Active enrollments"
            value={activeEnrollments}
            caption="Students currently moving through course content."
            icon={<GraduationCapIcon className="h-5 w-5" />}
            tone="emerald"
          />
          <AdminStatCard
            index={2}
            title="Open doubts"
            value={openDoubts}
            caption="Learner questions still waiting on mentor action."
            icon={<MessageSquareIcon className="h-5 w-5" />}
            tone="amber"
          />
          <AdminStatCard
            index={3}
            title="Published courses"
            value={publishedCourses}
            caption="Courses currently visible and enrollable on the platform."
            icon={<BookOpenIcon className="h-5 w-5" />}
            tone="slate"
          />
        </StaggerGrid>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
          <RevealSection>
            <AdminPanel className="h-full">
              <AdminPanelHeader
                icon={UserPlus}
                tone="sky"
                title="Recent enrollments"
                description="Most recent joins across the last 7 days"
              />

              <ul className="mt-5 divide-y divide-[#f1f5f9]">
                {data?.recentEnrollments?.length ? (
                  data.recentEnrollments.map((enrollment, index) => (
                    <motion.li
                      key={`${enrollment.studentEmail}-${index}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.25 }}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e0f2fe] text-[13px] font-semibold text-[#0369a1]">
                          {(enrollment.studentName ?? enrollment.studentEmail ?? "S").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[#0f172a]">
                            {enrollment.studentName ?? "Unnamed student"}
                          </p>
                          <p className="truncate text-[12px] text-[#64748b]">{enrollment.courseTitle}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[12px] text-[#94a3b8]">
                        {formatRelativeTime(enrollment.createdAt)}
                      </span>
                    </motion.li>
                  ))
                ) : (
                  <li className="list-none">
                    <AdminEmptyState icon={UserPlus} title="No recent enrollments" description="New joins from the last 7 days will show up here." />
                  </li>
                )}
              </ul>
            </AdminPanel>
          </RevealSection>

          <div className="space-y-6">
            <RevealSection>
              <AdminPanel>
                <AdminPanelHeader
                  icon={MessageCircleQuestion}
                  tone="amber"
                  title="Open doubts"
                  description="Questions waiting on a mentor"
                  actions={<StatusBadge tone={openDoubts > 0 ? "warning" : "good"}>{openDoubts} open</StatusBadge>}
                />

                <ul className="mt-5 divide-y divide-[#f1f5f9]">
                  {data?.recentDoubts?.length ? (
                    data.recentDoubts.map((doubt, index) => (
                      <motion.li
                        key={doubt.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.25 }}
                        className="flex items-start justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-[#0f172a]">{doubt.subject}</p>
                          <p className="mt-0.5 truncate text-[12px] text-[#64748b]">
                            {doubt.studentName ?? "Unknown student"} · {formatRelativeTime(doubt.createdAt)}
                          </p>
                        </div>
                        <StatusBadge tone={priorityTone[doubt.priority] ?? "neutral"}>
                          {doubt.priority.charAt(0) + doubt.priority.slice(1).toLowerCase()}
                        </StatusBadge>
                      </motion.li>
                    ))
                  ) : (
                    <li className="list-none">
                      <AdminEmptyState icon={CircleCheck} title="All doubts answered" />
                    </li>
                  )}
                </ul>
              </AdminPanel>
            </RevealSection>

            <RevealSection delay={0.06}>
              <AdminPanel>
                <AdminPanelHeader icon={Gauge} tone="violet" title="Operations snapshot" description="Ratios across the whole roster" />
                <div className="mt-5 space-y-5">
                  {[
                    {
                      label: "Enrollment intensity",
                      hint: "Active enrollments per student",
                      value: enrollmentIntensity,
                      color: "bg-[#209bd2]",
                      track: "bg-[#e0f2fe]",
                    },
                    {
                      label: "Support load",
                      hint: "Open doubts per student",
                      value: supportLoad,
                      color: "bg-[#f59e0b]",
                      track: "bg-[#fef3c7]",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-[#334155]">{item.label}</p>
                          <p className="text-[11px] text-[#94a3b8]">{item.hint}</p>
                        </div>
                        <span className="text-[15px] font-semibold text-[#0f172a]">{item.value}%</span>
                      </div>
                      <div className={`mt-2 h-1.5 overflow-hidden rounded-full ${item.track}`}>
                        <motion.div
                          className={`h-full rounded-full ${item.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(item.value, 100)}%` }}
                          transition={{ duration: 0.7 }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 border-t border-[#eef1f5] pt-4">
                    <div>
                      <p className="text-[13px] font-medium text-[#334155]">Learners per course</p>
                      <p className="text-[11px] text-[#94a3b8]">Active enrollments per published course</p>
                    </div>
                    <span className="text-[15px] font-semibold text-[#0f172a]">{courseCoverage}</span>
                  </div>
                </div>
              </AdminPanel>
            </RevealSection>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
