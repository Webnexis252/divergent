"use client";

import { use, useEffect, useState } from "react";
import { Camera, ArrowLeft, TriangleAlert, Clock, BookOpen, CalendarCheck, Sparkles, UserRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { AdminPageHeader, adminButton, adminPanelClass } from "../../_components/admin-ui";
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

function UserAvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#e0f2fe] text-[18px] font-semibold text-[#0369a1]">
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <PageTransition>
      <div>
        <div className="px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
          <div className="mx-auto max-w-[1280px] space-y-6">
            {/* Back Button */}
            <div className="flex items-center gap-2">
              <Link
                href="/admin/students"
                className="flex items-center gap-2 text-sm font-semibold text-[#64748b] transition-colors hover:text-[#0f172a]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to students
              </Link>
            </div>

            {loading ? (
              <ProfileSkeleton />
            ) : error ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <div className="max-w-sm rounded-[20px] border border-[#fecaca] bg-white px-8 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                  <TriangleAlert className="mx-auto mb-2 h-6 w-6 text-[#b91c1c]" />
                  <p className="text-[15px] font-semibold text-[#0f172a]">{error}</p>
                  <button type="button" className={`${adminButton.secondary} mt-4`} onClick={() => window.location.reload()}>
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <RevealSection>
                  <AdminPageHeader
                    eyebrow="Student profile · read-only"
                    icon={UserRound}
                    title={
                      <span className="flex items-center gap-4">
                        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#e2e8f0] bg-white">
                          {studentUser?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={displayName} src={studentUser.image} className="h-full w-full object-cover" />
                          ) : (
                            <UserAvatarPlaceholder name={displayName} />
                          )}
                        </span>
                        <span className="min-w-0 truncate">{displayName}</span>
                      </span>
                    }
                    description={displayEmail}
                  />
                </RevealSection>

                <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <AdminStatCard index={0} title="Total watch time" value={stats?.totalWatchTimeDisplay ?? "0 mins"} caption="Across every enrolled course." icon={<Clock />} tone="sky" />
                  <AdminStatCard index={1} title="Courses enrolled" value={stats?.coursesEnrolled ?? 0} caption="Active course enrollments." icon={<BookOpen />} tone="emerald" />
                  <AdminStatCard index={2} title="Total XP" value={(stats?.totalXp ?? 0).toLocaleString("en-IN")} caption="Earned from lessons, tests and streaks." icon={<Sparkles />} tone="amber" />
                  <AdminStatCard index={3} title="Attendance" value={`${stats?.attendance?.percent ?? 0}%`} caption={`${stats?.attendance?.attended ?? 0} of ${stats?.attendance?.total ?? 0} live classes`} icon={<CalendarCheck />} tone="violet" />
                </StaggerGrid>

                {/* Charts & Lists Grid */}
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
                  {/* Category Performance */}
                  <div className={`${adminPanelClass} p-5 sm:p-6`}>
                    {stats?.skills && stats.skills.length > 0 ? (
                      <CategoryPerformancePanel
                        items={stats.skills}
                        title="Skill proficiency"
                        description={`Built from the latest ${stats.skillTestsEvaluated} graded test${stats.skillTestsEvaluated === 1 ? "" : "s"} (up to 3).`}
                      />
                    ) : (
                      <div className="py-12 text-center">
                        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Skill proficiency</h3>
                        <p className="mt-3 text-[13px] text-[#94a3b8]">
                          Complete a few graded tests and the category chart will show up here.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attendance, Notifications, Weekly Goals */}
                  <div className="space-y-6">
                    <div className={`${adminPanelClass} p-5 sm:p-6`}>
                      <AttendanceCircle
                        classes={stats?.attendance?.attended ?? 0}
                        percent={stats?.attendance?.percent ?? 0}
                        total={stats?.attendance?.total ?? 0}
                      />
                    </div>
                    <div className={`${adminPanelClass} p-5 sm:p-6`}>
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Notifications</h3>
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f1f5f9] px-1.5 text-[12px] font-semibold text-[#334155]">
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
                          <p className="text-[13px] text-[#94a3b8]">No new notifications</p>
                        )}
                      </div>
                    </div>

                    <div className={`${adminPanelClass} p-5 sm:p-6`}>
                      <h3 className="mb-6 text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Weekly goals</h3>
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
                          <p className="text-[13px] text-[#94a3b8]">No goals set yet</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Topic Mastery */}
                <RevealSection>
                  <div className={`${adminPanelClass} p-5 sm:p-6`}>
                    <h3 className="mb-6 text-[18px] font-semibold tracking-[-0.02em] text-[#0f172a]">Topic mastery</h3>
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
                        <p className="text-[13px] text-[#94a3b8]">No mastery data yet</p>
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
