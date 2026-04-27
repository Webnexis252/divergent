"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { KeyRound, Lock } from "lucide-react";
import { formatShortDate } from "@/lib/date-format";
import type { Mentor } from "./_types";
import { MentorGoalsModal } from "./MentorGoalsModal";
import { MentorSkillsModal } from "./MentorSkillsModal";

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  SUPER_ADMIN: { label: "Super Admin", bg: "bg-red-50",    text: "text-red-600",    dot: "bg-red-500" },
  ADMIN:       { label: "Admin",       bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-500" },
  MENTOR:      { label: "Mentor",      bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
};

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.MENTOR;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-[#f8f9fb] px-4 py-3">
      <span className="text-[18px] font-bold text-[#101828]">{value}</span>
      <span className="mt-0.5 text-[11px] text-[#667085]">{label}</span>
    </div>
  );
}

export function MentorCard({
  mentor,
  index,
  onGenerateOtp,
  onSetPassword,
}: {
  mentor: Mentor;
  index: number;
  onGenerateOtp?: () => void;
  onSetPassword?: () => void;
}) {
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);

  const initials = (mentor.name ?? mentor.email ?? "M")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const resolvedThisWeek = mentor.managedDoubts.length;
  const totalDoubts = mentor._count.managedDoubts;
  const resolutionRate =
    totalDoubts > 0 ? Math.round((resolvedThisWeek / totalDoubts) * 100) : 0;

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.04, duration: 0.35 }}
        whileHover={{ y: -5, boxShadow: "0 20px 48px rgba(124,58,237,0.10)" }}
        className="flex flex-col overflow-hidden rounded-[24px] border border-[#eceef2] bg-white transition-shadow"
      >
        {/* Coloured top band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]" />

        <div className="flex flex-1 flex-col p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {mentor.image ? (
                <img
                  src={mentor.image}
                  alt={mentor.name ?? ""}
                  className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-2 ring-violet-100"
                />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] text-sm font-bold text-white ring-2 ring-violet-100">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-[#101828]">{mentor.name ?? "Unnamed"}</p>
                <p className="mt-0.5 truncate text-[12px] text-[#667085]">{mentor.email}</p>
              </div>
            </div>
            <RoleBadge role={mentor.role} />
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <StatChip value={totalDoubts}       label="Doubts" />
            <StatChip value={mentor._count.doubtReplies} label="Replies" />
            <StatChip value={resolvedThisWeek}  label="Week✓" />
          </div>

          {/* Resolution rate bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#667085]">7-day resolution rate</span>
              <span className="font-semibold text-[#101828]">{resolutionRate}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f0f0f5]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#a78bfa]"
                initial={{ width: 0 }}
                whileInView={{ width: `${resolutionRate}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              />
            </div>
          </div>

          {/* Joined */}
          <p className="mt-3 text-[11px] text-[#94a3b8]">
            Joined {formatShortDate(mentor.createdAt)}
          </p>

          {/* Actions */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              id={`mentor-goals-btn-${mentor.id}`}
              onClick={() => setIsGoalsOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
              </svg>
              Monthly Goals
            </button>
            <button
              id={`mentor-skills-btn-${mentor.id}`}
              onClick={() => setIsSkillsOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-[12px] font-semibold text-violet-700 transition-all hover:bg-violet-100 hover:shadow-sm active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Skill Ratings
            </button>
          </div>

          {/* Teacher Security Actions (MENTOR only) */}
          {mentor.role === "MENTOR" && (onGenerateOtp || onSetPassword) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {onGenerateOtp && (
                <button
                  id={`mentor-otp-btn-${mentor.id}`}
                  onClick={onGenerateOtp}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-[12px] font-semibold text-yellow-700 transition-all hover:bg-yellow-100 hover:shadow-sm active:scale-95"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset OTP
                </button>
              )}
              {onSetPassword && (
                <button
                  id={`mentor-setpw-btn-${mentor.id}`}
                  onClick={onSetPassword}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-[12px] font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm active:scale-95"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Set Password
                </button>
              )}
            </div>
          )}
        </div>
      </motion.article>

      {isGoalsOpen && <MentorGoalsModal mentor={mentor} onClose={() => setIsGoalsOpen(false)} />}
      {isSkillsOpen && <MentorSkillsModal mentor={mentor} onClose={() => setIsSkillsOpen(false)} />}
    </>
  );
}
