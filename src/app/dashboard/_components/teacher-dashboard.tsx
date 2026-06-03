"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";

import {
  FloatPulse,
  PageTransition,
  ParallaxHero,
  RevealSection,
  StaggerGrid,
} from "./motion-wrappers";
import { useAuth } from "@/context/auth-context";
import { TeacherAssignmentModal } from "./teacher-assignment-modal";
import { TeacherSidebar } from "./teacher-sidebar";
import { TeacherTopBar } from "./teacher-top-bar";
import { TeacherStatCard } from "./teacher-stats-grid";
import { ClassControlIcon, DoubtIcon, DashboardIcon, AnalyticsIcon, ProfileIcon, ReplyIcon, WarningIcon } from "./teacher-icons";

const ease = [0.22, 1, 0.36, 1] as const;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const todaysClasses = [
  {
    title: "React Fundamentals",
    time: "10:00 - 11:30 AM",
    students: "24 students",
    action: "Start Now",
    actionTone: "info" as const,
  },
  {
    title: "React Fundamentals",
    time: "10:00 - 11:30 AM",
    students: "24 students",
    action: "Join Now",
    actionTone: "success" as const,
    live: true,
  },
  {
    title: "React Fundamentals",
    time: "10:00 - 11:30 AM",
    students: "24 students",
    action: "Completed",
    actionTone: "success" as const,
  },
  {
    title: "React Fundamentals",
    time: "10:00 - 11:30 AM",
    students: "24 students",
    action: "Completed",
    actionTone: "success" as const,
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const doubts = Array.from({ length: 4 }, (_, index) => ({
  name: "Rahul Sharma",
  message: "Can you explain the concept of React Hooks in more detail?",
  time: `${5 + index * 2} mins ago`,
}));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const assignments = [
  { label: "Total", value: "24", tone: "bg-[#eef7ff] text-[#38c1ff]" },
  { label: "Pending", value: "15", tone: "bg-[#fff6df] text-[#f59e0b]" },
  { label: "Late", value: "06", tone: "bg-[#fff0ee] text-[#ef4444]" },
];

import { PanelHeader, TeacherClassRow, TeacherDoubtCard, TeacherBarChart } from "./teacher-dashboard-components";
export function TeacherDashboard() {
  const { user, isLoading } = useAuth();

  type TeacherStats = {
    stats: { activeStudents: number; doubtsResolvedToday: number; openDoubtsCount: number; totalEnrollmentsThisWeek: number; avgResponseTime: string; studentSatisfaction: number };
    todaysClasses: { id: string; title: string; courseTitle: string; startTime: string; duration: number; meetingUrl: string | null; attendeeCount: number }[];
    doubtQueue: { id: string; subject: string; priority: string; status: string; studentName: string | null; studentImage: string | null; createdAt: string }[];
    recentActivity: { title: string; detail: string; createdAt: string }[];
    analyticsSnapshot: { 
      progressBars: { month: string; value: number }[]; 
      lowEngagementCount: number; 
      missedAssignments: number;
      assignmentsOverview: { total: number; pending: number; late: number };
    };
  };

  const fetcher = (url: string) => fetch(url).then((res) => res.json()).then((res: { success: boolean, data: TeacherStats }) => res.data);
  const { data, isLoading: statsLoading, mutate } = useSWR('/api/teacher/stats', fetcher);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const liveStatCards = [
    {
      title: 'Doubts Resolved Today',
      value: statsLoading ? '…' : String(data?.stats.doubtsResolvedToday ?? 0),
      note: `${data?.stats.openDoubtsCount ?? 0} still open`,
      icon: 'resolve' as const, iconBg: 'bg-[#f0fdf4]', iconColor: '#22c55e',
    },
    {
      title: 'Avg Response Time',
      value: statsLoading ? '…' : (data?.stats.avgResponseTime ?? '—'),
      note: 'based on resolved doubts',
      icon: 'clock' as const, iconBg: 'bg-[#eff6ff]', iconColor: '#3b82f6',
    },
    {
      title: 'Student Satisfaction',
      value: statsLoading ? '…' : (data?.stats.studentSatisfaction ? String(data?.stats.studentSatisfaction) : 'N/A'),
      note: 'Rating system coming soon',
      icon: 'star' as const, iconBg: 'bg-[#fefce8]', iconColor: '#f59e0b',
    },
    {
      title: 'Active Students',
      value: statsLoading ? '…' : String(data?.stats.activeStudents ?? 0),
      note: `+${data?.stats.totalEnrollmentsThisWeek ?? 0} enrolled this week`,
      icon: 'students' as const, iconBg: 'bg-[#faf5ff]', iconColor: '#a855f7',
    },
  ];

  const todaysClassesList = data?.todaysClasses ?? [];
  const doubtList = data?.doubtQueue ?? [];
  const openDoubtsCount = data?.stats.openDoubtsCount ?? 0;
  const todayClassCount = todaysClassesList.length;
  
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f7f6f6]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-[#38c1ff] border-t-transparent"
        />
      </div>
    );
  }

  const displayName = user?.name || "Teacher";

  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <PageTransition>
        <TeacherTopBar />
        {/* Shared layout: sidebar + main — same grid as student/admin pages */}
        <div className="mx-auto grid max-w-[1920px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <TeacherSidebar />

          <main className="space-y-8 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:px-10 xl:px-14">
            <ParallaxHero className="rounded-[28px]">
              <RevealSection>
                <section
                  id="teacher-overview"
                  className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#38c1ff] to-[#0077ff] px-6 py-10 text-white shadow-[0_24px_48px_rgba(56,193,255,0.25)] sm:px-8 lg:min-h-[288px] lg:px-12 lg:py-14"
                >
                  <motion.div
                    className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.6, 0.35] }}
                    transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="pointer-events-none absolute left-[42%] top-12 h-36 w-36 rounded-full bg-[#fec600]/25 blur-3xl"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.18, 0.4, 0.18] }}
                    transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                  />
                  <motion.div
                    className="pointer-events-none absolute bottom-[-60px] right-[18%] h-40 w-40 rounded-full bg-white/10 blur-3xl"
                    animate={{ y: [0, -10, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                  />

                  <div className="relative z-10 max-w-[700px]">
                    <div className="flex items-center gap-3">
                      <motion.h1
                        className="text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.03em]"
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease }}
                      >
                        Good Morning, {displayName}!
                      </motion.h1>
                      <FloatPulse className="text-[clamp(1.6rem,2.8vw,2.5rem)]">
                        <span role="img" aria-label="waving hand">
                          👋
                        </span>
                      </FloatPulse>
                    </div>

                    <motion.p
                      className="mt-5 text-[clamp(1.05rem,2.2vw,1.75rem)] font-medium text-white/95"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, ease, delay: 0.08 }}
                    >
                      You have {todayClassCount} class{todayClassCount !== 1 ? 'es' : ''} and {openDoubtsCount} open doubt{openDoubtsCount !== 1 ? 's' : ''} today
                    </motion.p>
                    <motion.p
                      className="mt-2 text-[clamp(1rem,1.8vw,1.5rem)] text-white/88"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, ease, delay: 0.16 }}
                    >
                      You&apos;re on a roll today 🚀
                    </motion.p>
                  </div>
                </section>
              </RevealSection>
            </ParallaxHero>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_422px]">
              <div className="space-y-6">
                <StaggerGrid className="grid gap-4 md:grid-cols-2">
                  {liveStatCards.map((card) => (
                    <TeacherStatCard key={card.title} {...card} />
                  ))}
                </StaggerGrid>

                <RevealSection delay={0.08}>
                  <section
                    id="class-control"
                    className="overflow-hidden rounded-[24px] border border-[#e9e9e9] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                  >
                    <PanelHeader
                      icon={<ClassControlIcon className="h-5 w-5 text-[#5b7fff]" />}
                      iconTone="bg-[#eef2ff]"
                      title="Today's Classes"
                      subtitle={`${todaysClassesList.length} scheduled today`}
                      actionNode={
                        <Link
                          href="/dashboard/teacher/class-control"
                          className="inline-flex h-9 items-center justify-center rounded-[10px] bg-[#38c1ff] px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(56,193,255,0.4)] transition hover:scale-105 hover:bg-[#1baee8]"
                        >
                          View all
                        </Link>
                      }
                    />

                    <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                      {statsLoading ? (
                        <div className="flex items-center gap-2 py-3 text-[#8b8888]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent" />Loading...</div>
                      ) : todaysClassesList.length === 0 ? (
                        <p className="py-3 text-[13px] text-[#9ca3af]">No classes scheduled for today.</p>
                      ) : (
                        todaysClassesList.map((cls) => (
                          <TeacherClassRow
                            key={cls.id}
                            id={cls.id}
                            title={cls.title}
                            time={new Date(cls.startTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            students={`${cls.attendeeCount} students`}
                            action={cls.meetingUrl ? "Start Now" : "Scheduled"}
                            actionTone="info"
                          />
                        ))
                      )}
                    </div>
                  </section>
                </RevealSection>
              </div>

              <div className="space-y-6">
                <RevealSection delay={0.1}>
                  <section
                    id="doubts"
                    className="overflow-hidden rounded-[24px] border border-[#e9e9e9] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
                  >
                    <PanelHeader
                      icon={<DoubtIcon className="h-5 w-5 text-[#f97316]" />}
                      iconTone="bg-[#fff3e8]"
                      title="Doubt Overview"
                      subtitle={`${openDoubtsCount} open`}
                      badge={String(openDoubtsCount)}
                    />

                    <StaggerGrid className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                      {statsLoading ? (
                        <div className="flex items-center gap-2 py-3 text-[#8b8888]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent" />Loading...</div>
                      ) : doubtList.length === 0 ? (
                        <p className="py-3 text-[13px] text-[#9ca3af]">No open doubts right now 🎉</p>
                      ) : (
                        doubtList.map((doubt, index) => (
                          <TeacherDoubtCard
                            key={doubt.id}
                            name={doubt.studentName ?? "Student"}
                            message={doubt.subject}
                            time={new Date(doubt.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                            index={index}
                          />
                        ))
                      )}
                    </StaggerGrid>
                  </section>
                </RevealSection>

                <RevealSection delay={0.16}>
                  <section className="overflow-hidden rounded-[24px] border border-[#e9e9e9] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                    <PanelHeader
                      icon={<DashboardIcon className="h-5 w-5 text-[#22c55e]" />}
                      iconTone="bg-[#edfdf2]"
                      title="Assignment Overview"
                      subtitle="Current status"
                      actionNode={
                        <button
                          onClick={() => setIsAssignmentModalOpen(true)}
                          className="flex h-9 items-center justify-center rounded-[10px] bg-[#38c1ff] px-4 text-[13px] font-semibold text-white shadow-[0_4px_14px_rgba(56,193,255,0.4)] transition hover:scale-105 hover:bg-[#1baee8]"
                        >
                          + Create
                        </button>
                      }
                    />

                    <div className="flex items-center justify-between px-4 sm:px-5">
                      <div className="grid w-full grid-cols-3 gap-4 py-4">
                        <motion.div
                          className={`rounded-[16px] px-4 py-5 text-center bg-[#f0f9ff] text-[#38c1ff]`}
                          whileHover={{ y: -3 }}
                        >
                          <p className="text-[14px] font-medium">Total</p>
                          <p className="mt-2 text-[34px] font-medium leading-none">
                            {statsLoading ? "…" : data?.analyticsSnapshot.assignmentsOverview.total}
                          </p>
                        </motion.div>
                        <motion.div
                          className={`rounded-[16px] px-4 py-5 text-center bg-[#fff6df] text-[#f59e0b]`}
                          whileHover={{ y: -3 }}
                        >
                          <p className="text-[14px] font-medium">Pending</p>
                          <p className="mt-2 text-[34px] font-medium leading-none">
                            {statsLoading ? "…" : data?.analyticsSnapshot.assignmentsOverview.pending}
                          </p>
                        </motion.div>
                        <motion.div
                          className={`rounded-[16px] px-4 py-5 text-center bg-[#fff0ee] text-[#ef4444]`}
                          whileHover={{ y: -3 }}
                        >
                          <p className="text-[14px] font-medium">Late</p>
                          <p className="mt-2 text-[34px] font-medium leading-none">
                            {statsLoading ? "…" : data?.analyticsSnapshot.assignmentsOverview.late}
                          </p>
                        </motion.div>
                      </div>
                    </div>

                    <motion.div
                      className="mx-4 mb-5 flex items-start gap-3 rounded-[14px] bg-[#fff5d8] px-4 py-3 sm:mx-5"
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, ease, delay: 0.08 }}
                    >
                      <WarningIcon />
                      <div>
                        <p className="text-[12px] font-medium text-[#9a5b00]">
                          Attention Required
                        </p>
                        <p className="mt-1 text-[10px] text-[#b8821b]">
                          {statsLoading ? "..." : `${data?.analyticsSnapshot.assignmentsOverview.pending} assignments need to be graded by tomorrow 📝`}
                        </p>
                      </div>
                    </motion.div>
                  </section>
                </RevealSection>
              </div>
            </div>

            <RevealSection delay={0.14}>
              <section
                id="analytics"
                className="overflow-hidden rounded-[24px] border border-[#e9e9e9] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              >
                <PanelHeader
                  icon={<AnalyticsIcon className="h-5 w-5 text-[#c026d3]" />}
                  iconTone="bg-[#fdf4ff]"
                  title="Student Progress Snapshot"
                  subtitle="Weekly engagement overview"
                />

                <div className="px-4 py-5 sm:px-7 sm:py-7">
                  {statsLoading ? (
                    <div className="flex items-center gap-2 py-3 text-[#8b8888]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent" />Loading...</div>
                  ) : data?.analyticsSnapshot ? (
                    <TeacherBarChart snapshot={data.analyticsSnapshot} />
                  ) : (
                    <p className="py-3 text-[13px] text-[#9ca3af]">No analytics available.</p>
                  )}
                </div>
              </section>
            </RevealSection>

            <RevealSection delay={0.18}>
              <section
                id="profile"
                className="overflow-hidden rounded-[24px] border border-[#e9e9e9] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
              >
                <PanelHeader
                  icon={<ProfileIcon className="h-5 w-5 text-[#6366f1]" />}
                  iconTone="bg-[#eef2ff]"
                  title="Recent Activity"
                  subtitle="Your latest actions"
                />

                <div className="space-y-2 px-4 py-4 sm:px-5 sm:py-5">
                  {statsLoading ? (
                    <div className="flex items-center gap-2 py-3 text-[#8b8888]"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent" />Loading...</div>
                  ) : !data?.recentActivity?.length ? (
                    <p className="py-3 text-[13px] text-[#9ca3af]">No recent activity.</p>
                  ) : (
                    data.recentActivity.map((item, index) => (
                      <motion.article
                        key={`${item.title}-${index}`}
                        className="flex items-start gap-3 rounded-[16px] px-3 py-3 transition hover:bg-[#fafafa]"
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, ease, delay: index * 0.04 }}
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#dbeafe]">
                          <DashboardIcon className="h-4 w-4 text-[#4f8dfd]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[14px] font-semibold text-[#101828]">
                                {item.title}
                              </p>
                              <p className="mt-1 text-[12px] text-[#4a5565]">
                                {item.detail}
                              </p>
                            </div>
                            <ReplyIcon />
                          </div>
                          <p className="mt-2 text-[12px] text-[#6a7282]">
                            {new Date(item.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        </div>
                      </motion.article>
                    ))
                  )}
                </div>
              </section>
            </RevealSection>
          </main>
        </div>
      </PageTransition>
      
      <TeacherAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => setIsAssignmentModalOpen(false)}
        onSuccess={() => void mutate()}
      />
    </div>
  );
}
