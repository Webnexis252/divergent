"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/auth-context";
import { DashboardSidebar } from "../_components/sidebar-nav";
import {
  PageTransition,
  RevealSection,
  FloatPulse,
} from "../_components/motion-wrappers";
import {
  AttendanceCircle,
  ProfileGoalRow,
  TopicMasteryBar,
  ProfileNotificationItem,
  ProfileSkeleton,
} from "../_components/profile-components";
import { BadgesShowcase } from "../_components/badges-showcase";
import { CategoryPerformancePanel } from "../_components/test-taking/category-performance-panel";
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

export default function StudentProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Compress + convert the picked file to a base64 data URL then PATCH the API */
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;

      // Compress via canvas to max 400×400 and quality 0.85
      const img = new Image();
      img.onload = async () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.85);

        setAvatarPreview(compressed);
        setAvatarUploading(true);
        try {
          const res = await fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: compressed }),
          });
          const json = await res.json();
          if (json.success) {
            await refreshUser();
          } else {
            setAvatarPreview(null); // revert on failure
          }
        } catch {
          setAvatarPreview(null);
        } finally {
          setAvatarUploading(false);
          // reset so the same file can be picked again
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  const displayName = user?.name || "Student";
  const displayEmail = user?.email || "student@divergent.in";
  const displayDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    // Wait for auth to settle before doing anything
    if (authLoading) return;
    // Auth resolved but no user (unauthenticated) — nothing to fetch
    if (!user?.id) return;

    const CACHE_KEY = `profile_stats_${user.id}`;
    const CACHE_TTL_MS = 60_000; // 60 seconds

    // Serve from sessionStorage if fresh enough
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw) as { ts: number; data: ProfileStats };
        if (Date.now() - ts < CACHE_TTL_MS) {
          setStats(data);
          return; // skip network request entirely
        }
      }
    } catch {
      // sessionStorage may be unavailable (private mode); fall through
    }

    let mounted = true;
    const controller = new AbortController();
    setLoading(true);

    fetch("/api/users/me/profile-stats", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (data.success) {
          setStats(data.data.stats);
          // Cache the result in sessionStorage
          try {
            sessionStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ ts: Date.now(), data: data.data.stats })
            );
          } catch {
            // Ignore quota errors
          }
        } else {
          setError(data.error || "Failed to load profile stats.");
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setError("Network error — could not load profile stats.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [authLoading, user?.id]);

  return (
    <PageTransition>
      <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
        <DashboardSidebar />

        <main className="min-h-screen bg-[#f8fafc]">
          <div className="px-6 py-8 lg:px-12">
          <div className="mx-auto max-w-[1200px] space-y-8">
            {authLoading || loading ? (
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
                      Welcome back, {displayName.split(" ")[0]}!
                    </h1>
                    <p className="mt-2 text-[20px] opacity-90">
                      Always stay updated in your student portal
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
                    {/* Clickable avatar with camera overlay */}
                    <div
                      className="group relative h-20 w-20 cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                      title="Change profile photo"
                    >
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        type="file"
                        onChange={handleAvatarChange}
                      />
                      {/* Avatar circle */}
                      <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white">
                        {avatarPreview || user?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            alt={displayName}
                            src={avatarPreview ?? user!.image!}
                            className="h-full w-full object-cover transition-opacity"
                            style={{ opacity: avatarUploading ? 0.5 : 1 }}
                          />
                        ) : (
                          <UserAvatarPlaceholder name={displayName} />
                        )}
                      </div>
                      {/* Camera overlay — always visible on mobile, hover on desktop */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        {avatarUploading ? (
                          <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                        ) : (
                          <Camera className="h-5 w-5 text-white" />
                        )}
                      </div>
                      {/* Small camera badge (always visible) */}
                      <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#1b77ff] shadow">
                        <Camera className="h-3 w-3 text-white" />
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
                    <p className="mt-2 text-[11px] opacity-60">Tap photo to change</p>
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
                        description={`Built from your latest ${stats.skillTestsEvaluated} graded test${stats.skillTestsEvaluated === 1 ? "" : "s"} (up to 3).`}
                      />
                    ) : (
                      <div className="py-12 text-center">
                        <h3 className="text-[18px] font-bold text-black">Skill Proficiency</h3>
                        <p className="mt-3 text-sm text-gray-400">
                          Complete a few graded tests and your category chart will show up here.
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
                      <button className="mt-6 w-full text-center text-[14px] font-bold text-gray-400 hover:text-gray-600 transition-colors">
                        Mark all as read
                      </button>
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
        </main>
      </div>
    </PageTransition>
  );
}
