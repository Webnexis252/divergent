"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { formatDistanceToNow } from "date-fns";
import useSWR from "swr";
import { useAuth } from "@/context/auth-context";
import { apiClient } from "@/lib/api-client";
import { TeacherTopBar } from "../../_components/teacher-top-bar";
import { TeacherSidebar } from "../../_components/teacher-sidebar";
import {
  PageTransition,
  RevealSection,
  FloatPulse,
} from "../../_components/motion-wrappers";
import {
  ProfileStatCard,
  SkillsRadarChart,
  AttendanceCircle,
  ProfileGoalRow,
  TopicMasteryBar,
  ProfileNotificationItem,
  ProfileSkeleton,
} from "../../_components/profile-components";

const assets = {
  bannerIllustration: "https://www.figma.com/api/mcp/asset/ed4da357-c8f5-410a-8e68-45347e8c1af8",
  teachingIcon: "https://www.figma.com/api/mcp/asset/7f05925d-67c8-48cc-8236-da89d98f6254",
  mentorshipIcon: "https://www.figma.com/api/mcp/asset/ad53f3b3-4ffe-4ea7-a943-e1f9db54a171",
  profileAvatar: "https://www.figma.com/api/mcp/asset/a837ccce-b7e2-4308-895f-5d48fccd59c5",
};

interface TeacherStats {
  totalTeachingHours: number;
  studentsMentored: number;
  attendance: { attended: number; percent: number; total: number };
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  monthlyGoals: Array<{ title: string; percent: number; completed: boolean }>;
  coursePerformance: Array<{ label: string; value: number; color: string }>;
  skills: Array<{ label: string; value: number; color: string }>;
}

const fetcher = (url: string) => apiClient.get<{ stats: TeacherStats }>(url).then((res) => res.stats);

export default function TeacherProfilePage() {
  const { user } = useAuth();
  
  const { data: stats, isLoading: loading } = useSWR<TeacherStats>(
    user?.id ? "/api/users/me/profile-stats" : null,
    fetcher,
  );

  const displayName = user?.name || "Mentor";
  const displayEmail = user?.email || "mentor@divergent.edu";
  const displayDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <PageTransition>
      <main className="min-h-screen bg-[#f8fafc]">
        <TeacherTopBar />

        <div className="mx-auto max-w-[1920px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12">
            <TeacherSidebar />

            <div className="space-y-8">
              {loading ? (
                <ProfileSkeleton />
              ) : (
                <>
                  {/* Welcome Banner */}
                  <RevealSection>
                    <div className="relative overflow-hidden rounded-[24px] bg-[#925fe2] px-8 py-8 text-white shadow-lg">
                      <p className="text-[16px] font-medium opacity-90">{displayDate}</p>
                      <h1 className="mt-4 text-[36px] font-bold">Good morning, {displayName.split(" ")[0]}!</h1>
                      <p className="mt-2 text-[20px] opacity-90">Manage your classes and mentor students effectively.</p>
                      <FloatPulse className="absolute right-8 top-[-20px] h-[240px] w-[240px]">
                        <Image alt="" unoptimized fill className="object-contain" src={assets.bannerIllustration} />
                      </FloatPulse>
                    </div>
                  </RevealSection>

                  {/* Top Stats & Profile Card */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    <ProfileStatCard
                      bgColor="bg-[#a78bfa]"
                      image={assets.teachingIcon}
                      title="Total Teaching Hours"
                      value={stats?.totalTeachingHours || 0}
                    />
                    <ProfileStatCard
                      bgColor="bg-[#8b5cf6]"
                      image={assets.mentorshipIcon}
                      title="Students Mentored"
                      value={stats?.studentsMentored || 0}
                    />
                    <motion.div
                      className="flex flex-col items-center justify-center rounded-[24px] bg-[#925fe2] p-6 text-center text-white shadow-lg"
                      whileHover={{ y: -4 }}
                    >
                      <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-white">
                        <Image alt={displayName} unoptimized fill className="object-cover" src={user?.image || assets.profileAvatar} />
                      </div>
                      <h3 className="mt-4 text-[20px] font-bold">{displayName}</h3>
                      <p className="text-[14px] opacity-90">Expert Mentor</p>
                      <p className="mt-1 text-[12px] opacity-80">{displayEmail}</p>
                    </motion.div>
                  </div>

                  {/* Charts & Lists Grid */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Radar Chart */}
                    <div className="rounded-[24px] bg-white p-6 shadow-sm">
                      <h3 className="mb-6 text-[18px] font-bold text-black">Mentorship Skills</h3>
                      {stats?.skills && <SkillsRadarChart skills={stats.skills} />}
                    </div>

                    {/* Attendance & Notifications */}
                    <div className="space-y-6">
                      <div className="rounded-[24px] bg-white p-6 shadow-sm">
                        <AttendanceCircle 
                          classes={stats?.attendance?.attended || 0} 
                          percent={stats?.attendance?.percent || 0} 
                          total={stats?.attendance?.total || 0} 
                        />
                      </div>
                      <div className="rounded-[24px] bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-[18px] font-bold text-black">Admin Alerts</h3>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#925fe2] text-[12px] font-bold text-white">
                            {stats?.notifications?.length || 0}
                          </span>
                        </div>
                        <div className="space-y-4">
                          {stats?.notifications && stats.notifications.length > 0 ? (
                            stats.notifications.map((n) => (
                              <ProfileNotificationItem 
                                key={n.id}
                                title={n.title}
                                body={n.body}
                                timeText={formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                color="#925fe2"
                                bgColor="bg-purple-50"
                              />
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No new alerts</p>
                          )}
                        </div>
                        <button className="mt-6 w-full text-center text-[14px] font-bold text-gray-400">View all alerts</button>
                      </div>
                    </div>

                    {/* Teaching Goals */}
                    <div className="rounded-[24px] bg-white p-6 shadow-sm">
                      <h3 className="mb-6 text-[18px] font-bold text-black">Monthly Goals</h3>
                      <div className="space-y-4">
                        {stats?.monthlyGoals?.map((goal, i) => (
                          <ProfileGoalRow
                            key={i}
                            completed={goal.completed}
                            percent={goal.percent}
                            title={goal.title}
                            color="#925fe2"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Course Performance Mastery */}
                  <RevealSection>
                    <div className="rounded-[24px] bg-white p-8 shadow-sm">
                      <h3 className="mb-8 text-[22px] font-bold text-black">Course Performance Rating</h3>
                      <div className="space-y-6">
                        {stats?.coursePerformance?.map((course) => (
                          <TopicMasteryBar
                            key={course.label}
                            color={course.color}
                            label={course.label}
                            value={course.value}
                          />
                        ))}
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
