"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState, useEffect, useMemo } from "react";
import {
  AnimCard,
  AnimStat,
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "./motion-wrappers";
import { TeacherSidebar } from "./teacher-sidebar";

import { useAuth } from "@/context/auth-context";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type ApiDoubt = {
  id: string;
  subject: string;
  body: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  student: { id: string; name: string | null; email: string | null };
  _count: { replies: number };
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const statusToneMap: Record<string, string> = {
  OPEN: "bg-[rgba(255,61,0,0.1)] border-[#ff3d00] text-[#ff3d00]",
  ASSIGNED: "bg-[rgba(21,93,252,0.1)] border-[#155dfc] text-[#155dfc]",
  RESOLVED: "bg-[rgba(76,175,80,0.1)] border-[#4caf50] text-[#4caf50]",
  CLOSED: "bg-[rgba(100,100,100,0.1)] border-[#aaaaaa] text-[#555555]",
};

const priorityToneMap: Record<string, string> = {
  LOW: "bg-[rgba(76,175,80,0.1)] border-[#4caf50] text-[#4caf50]",
  MEDIUM: "bg-[rgba(254,198,0,0.1)] border-[#a65f00] text-[#a65f00]",
  HIGH: "bg-[rgba(255,61,0,0.1)] border-[#ff3d00] text-[#ff3d00]",
};




function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 text-black/35"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-3 w-3 text-[#6a7282]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function RepliesIcon() {
  return (
    <svg
      className="h-3 w-3 text-[#6a7282]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10h10" />
      <path d="M7 14h6" />
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-5l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function StatGlyph({ icon }: { icon: "check" | "pending" | "total" | string }) {
  if (icon === "check") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7.5 12.5 10.5 15.5 16.5 9.5" />
        <circle cx="12" cy="12" r="8.5" />
      </svg>
    );
  }

  if (icon === "pending") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    );
  }

  if (icon === "total") {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h10a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 17 17H10l-3.5 2.5V17H7A2.5 2.5 0 0 1 4.5 14.5z" />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 16 9 12l3 3 7-7" />
      <path d="M19 10V4h-6" />
    </svg>
  );
}

function DoubtStatCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: string | number;
  tone: string;
  icon: string;
}) {
  return (
    <AnimCard className="rounded-[14px] border border-[#d9d9d9] bg-white px-4 py-4 shadow-[0px_4px_10px_rgba(0,0,0,0.18)]">
      <div className="flex items-start gap-4">
        <div className={`grid h-11 w-11 place-items-center rounded-[10px] border ${tone}`}>
          <StatGlyph icon={icon} />
        </div>
        <div className="flex-1">
          <p className="text-[16px] font-medium leading-[20px] text-black">
            {title}
          </p>
          <AnimStat className="mt-2 origin-left text-[32px] font-bold leading-none text-black">
            {value}
          </AnimStat>
        </div>
      </div>
    </AnimCard>
  );
}

function DoubtCard({
  doubt,
  index,
  onReply,
}: {
  doubt: ApiDoubt;
  index: number;
  onReply: (id: string) => void;
}) {
  const statusTone = statusToneMap[doubt.status] ?? "bg-[#f3f4f6] border-[#9ca3af] text-[#4b5563]";
  const priorityTone = priorityToneMap[doubt.priority] ?? "";
  const initials = doubt.student.name
    ? doubt.student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <motion.article
      className="rounded-[20px] border border-[#d9d9d9] bg-white px-6 py-7 shadow-[0px_4px_13.9px_rgba(0,0,0,0.2)]"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease, delay: index * 0.05 }}
      whileHover={{ y: -4, boxShadow: "0 16px 32px rgba(0,0,0,0.14)" }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-5">
            <motion.div
              className="grid h-[63px] w-[63px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#38c1ff] to-[#0077ff] text-[20px] font-bold text-white"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3.2 + index * 0.2, repeat: Infinity }}
            >
              {initials}
            </motion.div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[20px] font-semibold leading-[20px] text-black">
                  {doubt.student.name ?? "Unknown Student"}
                </p>
                <span className="h-1 w-1 rounded-full bg-[#c4c4c4]" />
                <p className="text-[12px] font-medium text-[#797979]">
                  {doubt.student.email ?? ""}
                </p>
              </div>

              <p className="mt-3 text-[16px] font-medium leading-[20px] text-black">
                {doubt.subject}
              </p>

              <p className="mt-3 max-w-[720px] text-[14px] leading-[20px] text-[#4a5565]">
                {doubt.body}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className={`rounded-[10px] border px-5 py-1 text-[12px] font-medium ${priorityTone}`}>
                  {doubt.priority.charAt(0) + doubt.priority.slice(1).toLowerCase()} Priority
                </span>
                <span className="inline-flex items-center gap-2 text-[12px] text-[#6a7282]">
                  <ClockIcon />
                  {timeAgo(doubt.createdAt)}
                </span>
                <span className="inline-flex items-center gap-2 text-[12px] text-[#6a7282]">
                  <RepliesIcon />
                  {doubt._count.replies} {doubt._count.replies === 1 ? "reply" : "replies"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-start gap-8 lg:items-end">
          <span className={`rounded-[10px] border px-5 py-1 text-[12px] font-medium ${statusTone}`}>
            {doubt.status.charAt(0) + doubt.status.slice(1).toLowerCase()}
          </span>

          <div className="flex items-center gap-2">
            <Link href={`/dashboard/teacher/doubt-detail?id=${doubt.id}`}>
              <motion.span
                className="inline-flex rounded-[10px] border border-[#d9d9d9] px-4 py-2 text-[10px] font-medium text-black"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                View Details
              </motion.span>
            </Link>
            <motion.button
              className="rounded-[10px] bg-[#38c1ff] px-4 py-2 text-[10px] font-semibold text-white"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={() => onReply(doubt.id)}
            >
              Reply
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function TeacherDoubtList() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<ApiDoubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "ASSIGNED" | "RESOLVED" | "CLOSED">("ALL");

  useEffect(() => {
    const loadDoubts = () => {
      fetch("/api/doubts")
        .then((r) => r.json())
        .then((json) => { if (json.success) setDoubts(json.data); })
        .catch(console.error)
        .finally(() => setLoading(false));
    };
    loadDoubts();
    const interval = setInterval(loadDoubts, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return doubts.filter((d) => {
      const matchSearch = search === "" ||
        d.subject.toLowerCase().includes(search.toLowerCase()) ||
        (d.student.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [doubts, search, statusFilter]);

  const resolvedToday = doubts.filter((d) => {
    const today = new Date(); today.setHours(0,0,0,0);
    return (d.status === "RESOLVED" || d.status === "CLOSED") && new Date(d.updatedAt) >= today;
  }).length;
  const pending = doubts.filter((d) => d.status === "OPEN" || d.status === "ASSIGNED").length;
  const highPriority = doubts.filter((d) => d.priority === "HIGH" && (d.status === "OPEN" || d.status === "ASSIGNED")).length;

  const liveStats = [
    { title: "Total Doubts", value: loading ? "…" : String(doubts.length), tone: "bg-[rgba(21,93,252,0.1)] border-[#155dfc] text-[#155dfc]", icon: "total" as const },
    { title: "Resolved Today", value: loading ? "…" : String(resolvedToday), tone: "bg-[rgba(76,175,80,0.1)] border-[#4caf50] text-[#4caf50]", icon: "check" as const },
    { title: "Pending", value: loading ? "…" : String(pending), tone: "bg-[rgba(255,61,0,0.1)] border-[#ff3d00] text-[#ff3d00]", icon: "pending" as const },
    { title: "High Priority", value: loading ? "…" : String(highPriority), tone: "bg-[rgba(111,0,255,0.1)] border-[#925fe2] text-[#925fe2]", icon: "trend" as const },
  ];

  const statusFilters: { label: string; value: typeof statusFilter }[] = [
    { label: "All Status", value: "ALL" },
    { label: "Open", value: "OPEN" },
    { label: "Assigned", value: "ASSIGNED" },
    { label: "Resolved", value: "RESOLVED" },
  ];

  return (
    <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-0 lg:pt-8">
          <TeacherSidebar />

          <main className="space-y-6 lg:pr-[160px]">
            <RevealSection>
              <section className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <motion.div
                  className="flex min-h-[48px] flex-1 items-center rounded-[24px] bg-white px-5 shadow-[0px_2px_10px_4px_rgba(0,0,0,0.08)]"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease }}
                >
                  <SearchIcon />
                  <input
                    className="h-12 flex-1 bg-transparent px-3 text-[16px] text-black outline-none placeholder:text-black/45"
                    placeholder="Search by subject or student name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </motion.div>

                <motion.div
                  className="flex items-center justify-between gap-4 xl:min-w-[260px] xl:justify-end"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, ease, delay: 0.08 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 place-items-center rounded-full border-4 border-[#925fe2] bg-gradient-to-br from-[#925fe2] to-[#6f3fcf] text-[16px] font-bold text-white">
                      {user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "T"}
                    </div>
                    <p className="text-[16px] font-semibold text-black">{user?.name ?? "Teacher"}</p>
                  </div>
                </motion.div>
              </section>
            </RevealSection>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_198px]">
              <div className="space-y-4">
                <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {liveStats.map((stat) => (
                    <DoubtStatCard key={stat.title} {...stat} />
                  ))}
                </StaggerGrid>

                {highPriority > 0 && (
                  <RevealSection delay={0.08}>
                    <motion.div
                      className="flex min-h-[54px] items-center gap-3 rounded-[10px] border border-[#ffc9c9] bg-[#fef2f2] px-5 text-[14px] font-medium text-[#82181a]"
                      whileHover={{ y: -2 }}
                      transition={{ duration: 0.18 }}
                    >
                      <motion.span
                        className="h-4 w-4 rounded-full border border-[#ff3d00] bg-[#ff3d00]/20"
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                      {highPriority} high-priority doubt{highPriority !== 1 ? "s" : ""} need your attention ⚡
                    </motion.div>
                  </RevealSection>
                )}
              </div>

              <RevealSection delay={0.12}>
                <div className="space-y-3">
                  {statusFilters.map((f, index) => (
                    <motion.button
                      key={f.value}
                      className={`flex h-11 w-full items-center justify-between rounded-[8px] border px-4 text-[14px] font-medium transition ${
                        statusFilter === f.value
                          ? "border-[#38c1ff] bg-[#38c1ff] text-white"
                          : "border-transparent bg-white text-[#0a0a0a] shadow-[0px_2px_7.5px_rgba(0,0,0,0.18)]"
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.45, ease, delay: index * 0.05 }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setStatusFilter(f.value)}
                    >
                      {f.label}
                    </motion.button>
                  ))}
                </div>
              </RevealSection>
            </div>

            <section className="space-y-4 pb-8">
              {loading ? (
                <div className="flex items-center gap-3 py-16 justify-center text-[#8b8888]">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-6 w-6 rounded-full border-2 border-[#38c1ff] border-t-transparent" />
                  Loading doubts...
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#d9d9d9] bg-white py-16 text-center">
                  <p className="text-[40px]">✅</p>
                  <p className="mt-3 text-[16px] font-medium text-[#374151]">
                    {search || statusFilter !== "ALL" ? "No doubts match your filter" : "No open doubts — all clear!"}
                  </p>
                </div>
              ) : (
                filtered.map((doubt, index) => (
                  <DoubtCard
                    key={doubt.id}
                    doubt={doubt}
                    index={index}
                    onReply={(id) => window.location.href = `/dashboard/teacher/doubt-detail?id=${id}`}
                  />
                ))
              )}
            </section>
          </main>
        </div>
    </PageTransition>
  );
}
