"use client";

import { use, useEffect, useState } from "react";
import { Camera, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  PageTransition,
  RevealSection,
  FloatPulse,
} from "@/app/dashboard/_components/motion-wrappers";
import {
  AttendanceCircle,
  ProfileGoalRow,
  TopicMasteryBar,
  ProfileNotificationItem,
  ProfileSkeleton,
} from "@/app/dashboard/_components/profile-components";
import { BadgesShowcase } from "@/app/dashboard/_components/badges-showcase";
import { CategoryPerformancePanel } from "@/app/dashboard/_components/test-taking/category-performance-panel";
import type { CategoryPerformanceItem } from "@/lib/test-category-performance";

interface ProfileNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface WeeklyGoal {
  title: string;
  completed: boolean;
  percent: number;
}

interface TopicMastery {
  label: string;
  value: number;
  color: string;
}

interface ProfileStats {
  totalWatchTime: number;
  totalWatchTimeDisplay: string;
  totalWatchTimeSecs: number;
  totalXp: number;
  coursesEnrolled: number;
  skills: CategoryPerformanceItem[];
  skillTestsEvaluated: number;
  attendance: { attended: number; percent: number; total: number };
  notifications: ProfileNotification[];
  weeklyGoals: WeeklyGoal[];
  topicMastery: TopicMastery[];
}

interface StudentUser {
  name: string | null;
  email: string | null;
  image: string | null;
}

// --- Inline SVG Icons (no external dependencies) ---
function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" strokeOpacity="0.6" />
      <path d="M24 14v10l6 4" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.9" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <rect x="8" y="10" width="32" height="28" rx="4" stroke="white" strokeWidth="3" strokeOpacity="0.6" />
      <path d="M16 18h16M16 24h12M16 30h8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.9" />
    </svg>
  );
}

function UserAvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#38c1ff] to-[#1b77ff] text-white text-2xl font-bold">
      {initials || "S"}
    </div>
  );
}

export default function AdminStudentProfilePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = use(params);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [studentUser, setStudentUser] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/admin/students/${studentId}/profile-stats`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (data.success) {
          setStats(data.data.stats);
          setStudentUser(data.data.user);
        } else {
          setError(data.error || "Failed to load student profile.");
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError("Network error — could not load student profile.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [studentId]);

  const displayName = studentUser?.name || "Student";
  const displayEmail = studentUser?.email || "No email available";
  const displayDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#f8fafc]">
        <div className="px-6 py-8 lg:px-12">
          <div className="mx-auto max-w-[1200px] space-y-8">
            {/* Back Button */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/students"
                className="flex items-center gap-2 text-sm font-semibold text-[#64748b] transition-colors hover:text-[#0f172a]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Students
              </Link>
            </div>

            {loading ? (
              <ProfileSkeleton />
            ) : error ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-2xl bg-red-50 border border-red-100 px-8 py-6 max-w-sm">
                  <p className="text-2xl mb-2">⚠️</p>
                  <p className="text-base font-semibold text-red-700">{error}</p>
                  <button
                    className="mt-4 text-sm font-bold text-[#38c1ff] hover:underline"
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Welcome Banner */}
                <RevealSection>
                  <div className="relative overflow-hidden rounded-[24px] bg-[#38c1ff] px-8 py-8 text-white shadow-lg">
                    <p className="text-[16px] font-medium opacity-90">{displayDate}</p>
                    <h1 className="mt-4 text-[36px] font-bold leading-tight">
                      Viewing {displayName.split(" ")[0]}&apos;s Profile
                    </h1>
                    <p className="mt-2 text-[20px] opacity-90">
                      Student Dashboard View (Admin Read-Only)
                    </p>
                    <FloatPulse className="pointer-events-none absolute right-8 top-[-20px] h-[220px] w-[220px] opacity-20">
                      {/* Abstract decorative shape */}
                      <svg viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
                        <circle cx="110" cy="110" r="100" stroke="white" strokeWidth="3" />
                        <circle cx="110" cy="110" r="70" stroke="white" strokeWidth="2" />
                        <circle cx="110" cy="110" r="40" stroke="white" strokeWidth="2" />
                        <circle cx="110" cy="110" r="10" fill="white" />
                      </svg>
                    </FloatPulse>
                  </div>
                </RevealSection>

                {/* Top Stats & Profile Card */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Watch Time Card */}
                  <motion.div
                    className="relative flex flex-col justify-end overflow-hidden rounded-[20px] bg-[#81d4fa] p-6 text-white shadow-[0_4px_10px_rgba(0,0,0,0.15)] h-[150px]"
                    whileHover={{ y: -4, scale: 1.02 }}
                  >
                    <div className="absolute right-4 top-4 h-[70px] w-[70px] opacity-70">
                      <ClockIcon />
                    </div>
                    <div className="relative z-10 flex flex-col items-start">
                      <span className="text-[40px] font-bold leading-none sm:text-[48px]">
                        {stats?.totalWatchTimeDisplay ?? "0 mins"}
                      </span>
                      <span className="mt-1 text-[16px] font-semibold opacity-90">Total Watch Time</span>
                    </div>
                  </motion.div>

                  {/* Courses Enrolled Card */}
                  <motion.div
                    className="relative flex flex-col justify-end overflow-hidden rounded-[20px] bg-[#4fc3f7] p-6 text-white shadow-[0_4px_10px_rgba(0,0,0,0.15)] h-[150px]"
                    whileHover={{ y: -4, scale: 1.02 }}
                  >
                    <div className="absolute right-4 top-4 h-[70px] w-[70px] opacity-70">
                      <CoursesIcon />
                    </div>
                    <div className="relative z-10 flex flex-col items-start">
                      <span className="text-[48px] font-bold leading-none">{stats?.coursesEnrolled ?? 0}</span>
                      <span className="mt-1 text-[16px] font-semibold opacity-90">Courses Enrolled</span>
                    </div>
                  </motion.div>

                  {/* Profile Card */}
                  <motion.div
                    className="flex flex-col items-center justify-center rounded-[24px] bg-[#38c1ff] p-6 text-center text-white shadow-lg"
                    whileHover={{ y: -4 }}
                  >
                    <div className="relative h-20 w-20">
                      <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white">
                        {studentUser?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={displayName}
                            src={studentUser.image}
                            className="h-full w-full object-cover transition-opacity"
                          />
                        ) : (
                          <UserAvatarPlaceholder name={displayName} />
                        )}
                      </div>
                    </div>
                    <h3 className="mt-4 text-[20px] font-bold">{displayName}</h3>
                    <p className="text-[14px] opacity-90">Design Aspirant</p>
                    <p className="mt-1 text-[12px] opacity-80 break-all">{displayEmail}</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/16 px-4 py-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/78">
                        Total XP
                      </span>
                      <span className="text-[18px] font-bold text-white">
                        {(stats?.totalXp ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Charts & Lists Grid */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
                  {/* Category Performance */}
                  <div className="rounded-[24px] bg-white p-6 shadow-sm">
                    {stats?.skills && stats.skills.length > 0 ? (
                      <CategoryPerformancePanel
                        items={stats.skills}
                        title="Skill Proficiency"
                        description={`Built from the latest ${stats.skillTestsEvaluated} graded test${stats.skillTestsEvaluated === 1 ? "" : "s"} (up to 3).`}
                      />
                    ) : (
                      <div className="py-12 text-center">
                        <h3 className="text-[18px] font-bold text-black">Skill Proficiency</h3>
                        <p className="mt-3 text-sm text-gray-400">
                          Complete a few graded tests and the category chart will show up here.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attendance, Notifications, Weekly Goals */}
                  <div className="space-y-6">
                    <div className="rounded-[24px] bg-white p-6 shadow-sm">
                      <AttendanceCircle
                        classes={stats?.attendance?.attended ?? 0}
                        percent={stats?.attendance?.percent ?? 0}
                        total={stats?.attendance?.total ?? 0}
                      />
                    </div>
                    <div className="rounded-[24px] bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[18px] font-bold text-black">Notifications</h3>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#38c1ff] text-[12px] font-bold text-white">
                          {stats?.notifications?.length ?? 0}
                        </span>
                      </div>
                      <div className="space-y-4">
                        {stats?.notifications && stats.notifications.length > 0 ? (
                          stats.notifications.map((n: ProfileNotification) => (
                            <ProfileNotificationItem
                              key={n.id}
                              title={n.title}
                              body={n.body}
                              timeText={formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">No new notifications</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[24px] bg-white p-6 shadow-sm">
                      <h3 className="mb-6 text-[18px] font-bold text-black">Weekly Goals</h3>
                      <div className="space-y-4">
                        {stats?.weeklyGoals && stats.weeklyGoals.length > 0 ? (
                          stats.weeklyGoals.map((goal: WeeklyGoal, i: number) => (
                            <ProfileGoalRow
                              key={i}
                              completed={goal.completed}
                              percent={goal.percent}
                              title={goal.title}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">No goals set yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topic Mastery */}
                <RevealSection>
                  <div className="rounded-[24px] bg-white p-8 shadow-sm">
                    <h3 className="mb-8 text-[22px] font-bold text-black">Topic Mastery</h3>
                    <div className="space-y-6">
                      {stats?.topicMastery && stats.topicMastery.length > 0 ? (
                        stats.topicMastery.map((topic: TopicMastery) => (
                          <TopicMasteryBar
                            key={topic.label}
                            color={topic.color}
                            label={topic.label}
                            value={topic.value}
                          />
                        ))
                      ) : (
                        <p className="text-sm text-gray-400">No mastery data yet</p>
                      )}
                    </div>
                  </div>
                </RevealSection>

                {/* Achievements & Badges */}
                <RevealSection>
                  <BadgesShowcase />
                </RevealSection>
              </>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
