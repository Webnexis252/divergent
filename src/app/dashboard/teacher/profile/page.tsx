"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/auth-context";

import { TeacherSidebar } from "../../_components/teacher-sidebar";
import {
  FloatPulse,
  PageTransition,
  RevealSection,
} from "../../_components/motion-wrappers";
import {
  AttendanceCircle,
  ProfileGoalRow,
  ProfileNotificationItem,
  ProfileSkeleton,
  SkillsRadarChart,
  TopicMasteryBar,
} from "../../_components/profile-components";

interface TeacherNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

interface MonthlyGoal {
  id?: string;
  title: string;
  completed: boolean;
  percent: number;
}

interface TeacherSkill {
  label: string;
  value: number;
  color: string;
}

interface TeacherStats {
  totalTeachingHours: number;
  studentsMentored: number;
  attendance: { attended: number; percent: number; total: number };
  notifications: TeacherNotification[];
  monthlyGoals: MonthlyGoal[];
  coursePerformance: TeacherSkill[];
  skills: TeacherSkill[];
}

function TeachingHoursIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <circle cx="24" cy="24" r="20" stroke="white" strokeWidth="3" strokeOpacity="0.6" />
      <path
        d="M24 14v10l6 4"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
      />
    </svg>
  );
}

function StudentsMentoredIcon() {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <circle cx="18" cy="18" r="6" stroke="white" strokeWidth="3" strokeOpacity="0.6" />
      <circle cx="31" cy="20" r="5" stroke="white" strokeWidth="3" strokeOpacity="0.5" />
      <path
        d="M9 35c1.8-5 5.8-8 11-8s9.2 3 11 8"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
      <path
        d="M28 33c1.3-3.4 4.1-5.5 7.8-6"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
    </svg>
  );
}

function UserAvatarPlaceholder({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#38c1ff] to-[#1b77ff] text-2xl font-bold text-white">
      {initials || "M"}
    </div>
  );
}

export default function TeacherProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
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
            setAvatarPreview(null);
          }
        } catch {
          setAvatarPreview(null);
        } finally {
          setAvatarUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  }

  const displayName = user?.name || "Mentor";
  const displayEmail = user?.email || "mentor@divergent.edu";
  const displayDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    fetch("/api/users/me/profile-stats")
      .then((res) => res.json())
      .then((data) => {
        if (!mounted) return;

        if (data.success) {
          setStats(data.data.stats);
        } else {
          setError(data.error || "Failed to load teacher profile stats.");
        }
      })
      .catch(() => {
        if (mounted) setError("Network error — could not load teacher profile stats.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, user?.id]);

  return (
    <PageTransition>
      <main>
        <div className="mx-auto max-w-[1920px] px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
            <TeacherSidebar />

            <div className="space-y-8">
              {authLoading || loading ? (
                <ProfileSkeleton />
              ) : error ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                  <div className="max-w-sm rounded-2xl border border-red-100 bg-red-50 px-8 py-6">
                    <p className="mb-2 text-2xl">⚠️</p>
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
                  <RevealSection>
                    <div className="relative overflow-hidden rounded-[24px] bg-[#38c1ff] px-8 py-8 text-white shadow-lg">
                      <p className="text-[16px] font-medium opacity-90">{displayDate}</p>
                      <h1 className="mt-4 text-[36px] font-bold leading-tight">
                        Welcome back, {displayName.split(" ")[0]}!
                      </h1>
                      <p className="mt-2 text-[20px] opacity-90">
                        Always stay updated in your teacher portal
                      </p>
                      <FloatPulse className="pointer-events-none absolute right-8 top-[-20px] h-[220px] w-[220px] opacity-20">
                        <svg
                          viewBox="0 0 220 220"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-full w-full"
                        >
                          <circle cx="110" cy="110" r="100" stroke="white" strokeWidth="3" />
                          <circle cx="110" cy="110" r="70" stroke="white" strokeWidth="2" />
                          <circle cx="110" cy="110" r="40" stroke="white" strokeWidth="2" />
                          <circle cx="110" cy="110" r="10" fill="white" />
                        </svg>
                      </FloatPulse>
                    </div>
                  </RevealSection>

                  <div className="grid gap-6 lg:grid-cols-3">
                    <motion.div
                      className="relative flex h-[150px] flex-col justify-end overflow-hidden rounded-[20px] bg-[#81d4fa] p-6 text-white shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <div className="absolute right-4 top-4 h-[70px] w-[70px] opacity-70">
                        <TeachingHoursIcon />
                      </div>
                      <div className="relative z-10 flex flex-col items-start">
                        <span className="text-[48px] font-bold leading-none">
                          {stats?.totalTeachingHours ?? 0}
                        </span>
                        <span className="mt-1 text-[16px] font-semibold opacity-90">
                          Total Teaching Hours
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="relative flex h-[150px] flex-col justify-end overflow-hidden rounded-[20px] bg-[#4fc3f7] p-6 text-white shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <div className="absolute right-4 top-4 h-[70px] w-[70px] opacity-70">
                        <StudentsMentoredIcon />
                      </div>
                      <div className="relative z-10 flex flex-col items-start">
                        <span className="text-[48px] font-bold leading-none">
                          {stats?.studentsMentored ?? 0}
                        </span>
                        <span className="mt-1 text-[16px] font-semibold opacity-90">
                          Students Mentored
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      className="flex flex-col items-center justify-center rounded-[24px] bg-[#38c1ff] p-6 text-center text-white shadow-lg"
                      whileHover={{ y: -4 }}
                    >
                      <div
                        className="group relative h-20 w-20 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        title="Change profile photo"
                      >
                        <input
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          type="file"
                          onChange={handleAvatarChange}
                        />

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

                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          {avatarUploading ? (
                            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              />
                            </svg>
                          ) : (
                            <Camera className="h-5 w-5 text-white" />
                          )}
                        </div>

                        <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#1b77ff] shadow">
                          <Camera className="h-3 w-3 text-white" />
                        </div>
                      </div>

                      <h3 className="mt-4 text-[20px] font-bold">{displayName}</h3>
                      <p className="text-[14px] opacity-90">Expert Mentor</p>
                      <p className="mt-1 break-all text-[12px] opacity-80">{displayEmail}</p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/16 px-4 py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/78">
                          Students Reached
                        </span>
                        <span className="text-[18px] font-bold text-white">
                          {(stats?.studentsMentored ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] opacity-60">Tap photo to change</p>
                    </motion.div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
                    <div className="rounded-[24px] bg-white p-6 shadow-sm">
                      {stats?.skills && stats.skills.length > 0 ? (
                        <>
                          <h3 className="text-[18px] font-bold text-black">Mentorship Skills</h3>
                          <p className="mt-3 text-sm text-gray-500">
                            A snapshot of how your mentoring strengths are distributed right now.
                          </p>
                          <div className="mt-6">
                            <SkillsRadarChart skills={stats.skills} />
                          </div>
                        </>
                      ) : (
                        <div className="py-12 text-center">
                          <h3 className="text-[18px] font-bold text-black">Mentorship Skills</h3>
                          <p className="mt-3 text-sm text-gray-400">
                            Your mentoring skill breakdown will show up here once it has been configured.
                          </p>
                        </div>
                      )}
                    </div>

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
                          <h3 className="text-[18px] font-bold text-black">Admin Alerts</h3>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#38c1ff] text-[12px] font-bold text-white">
                            {stats?.notifications?.length ?? 0}
                          </span>
                        </div>

                        <div className="space-y-4">
                          {stats?.notifications && stats.notifications.length > 0 ? (
                            stats.notifications.map((notification) => (
                              <ProfileNotificationItem
                                key={notification.id}
                                title={notification.title}
                                body={notification.body}
                                timeText={formatDistanceToNow(new Date(notification.createdAt), {
                                  addSuffix: true,
                                })}
                              />
                            ))
                          ) : (
                            <p className="text-sm text-gray-400">No new alerts</p>
                          )}
                        </div>

                        <button className="mt-6 w-full text-center text-[14px] font-bold text-gray-400 transition-colors hover:text-gray-600">
                          View all alerts
                        </button>
                      </div>

                      <div className="rounded-[24px] bg-white p-6 shadow-sm">
                        <h3 className="mb-6 text-[18px] font-bold text-black">Monthly Goals</h3>
                        <div className="space-y-4">
                          {stats?.monthlyGoals && stats.monthlyGoals.length > 0 ? (
                            stats.monthlyGoals.map((goal, index) => (
                              <ProfileGoalRow
                                key={goal.id ?? `${goal.title}-${index}`}
                                completed={goal.completed}
                                percent={goal.percent}
                                title={goal.title}
                                color="#38c1ff"
                              />
                            ))
                          ) : (
                            <p className="text-sm text-gray-400">No goals set yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <RevealSection>
                    <div className="rounded-[24px] bg-white p-8 shadow-sm">
                      <h3 className="text-[22px] font-bold text-black">Course Performance Rating</h3>
                      <p className="mt-3 text-sm text-gray-500">
                        See how your active courses are performing at a glance.
                      </p>

                      <div className="mt-8 space-y-6">
                        {stats?.coursePerformance && stats.coursePerformance.length > 0 ? (
                          stats.coursePerformance.map((course) => (
                            <TopicMasteryBar
                              key={course.label}
                              color={course.color}
                              label={course.label}
                              value={course.value}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-gray-400">No course performance data yet.</p>
                        )}
                      </div>
                    </div>
                  </RevealSection>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
