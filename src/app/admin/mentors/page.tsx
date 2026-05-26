"use client";

import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { Clock, KeyRound, Lock, UserCheck, AlertCircle } from "lucide-react";
import type { Mentor } from "./_types";
import { OtpPanel, SetPasswordModal } from "./TeacherSecurityModals";

const MentorCard = lazy(() => import("./MentorCard").then((m) => ({ default: m.MentorCard })));

const ROLES = ["All", "MENTOR", "ADMIN", "SUPER_ADMIN"];
const ROLE_LABELS: Record<string, string> = { All: "All Roles", MENTOR: "Mentors", ADMIN: "Admins", SUPER_ADMIN: "Super Admins" };

type ModalState =
  | { type: "otp"; mentor: Mentor }
  | { type: "password"; mentor: Mentor }
  | null;

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[24px] border border-[#eceef2] bg-white">
      <div className="h-1.5 w-full bg-gray-200" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-gray-100" />)}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-xl bg-gray-100" />
          <div className="h-10 rounded-xl bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

// ── Pending Teacher Card ──────────────────────────────────────────────────────

function PendingTeacherCard({
  mentor,
  onGenerateOtp,
  onSetPassword,
}: {
  mentor: Mentor;
  onGenerateOtp: () => void;
  onSetPassword: () => void;
}) {
  const initials = (mentor.name ?? mentor.email ?? "?").slice(0, 2).toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-[20px] border-2 border-dashed border-[#facc15]/60 bg-[#fefce8] shadow-sm"
    >
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        {mentor.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mentor.image} alt={mentor.name ?? "Teacher"} className="h-12 w-12 rounded-2xl object-cover" />
        ) : (
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#facc15]/30 text-[16px] font-bold text-[#92400e]">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold text-[#111827] truncate">{mentor.name ?? "Unnamed"}</p>
              <p className="text-[13px] text-[#9ca3af] truncate">{mentor.email}</p>
            </div>
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-[#facc15]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#92400e]">
              <Clock className="h-3 w-3" /> PENDING
            </span>
          </div>

          <p className="mt-2 text-[12px] text-[#a16207]">
            Registered {new Date(mentor.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-[#facc15]/30 bg-[#fffbeb] px-4 py-3">
        <button
          onClick={onGenerateOtp}
          className="flex items-center justify-center gap-1.5 rounded-[10px] bg-[#facc15] px-3 py-2.5 text-[12px] font-bold text-[#1a1a1a] transition hover:bg-[#eab308]"
        >
          <KeyRound className="h-3.5 w-3.5" /> Generate OTP
        </button>
        <button
          onClick={onSetPassword}
          className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e7eb] bg-white px-3 py-2.5 text-[12px] font-bold text-[#374151] transition hover:bg-gray-50"
        >
          <Lock className="h-3.5 w-3.5" /> Set Password
        </button>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminMentorsPage() {
  const [active, setActive] = useState<Mentor[]>([]);
  const [pending, setPending] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"name" | "doubts" | "replies" | "joined">("joined");
  const [modal, setModal] = useState<ModalState>(null);

  const loadData = () => {
    setLoading(true);
    fetch("/api/admin/mentors")
      .then((r) => r.json())
      .then((p) => {
        if (p.success) {
          setActive(p.data.active ?? []);
          setPending(p.data.pending ?? []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(); 
  }, []);

  const filtered = useMemo(() => {
    let result = [...active];
    if (roleFilter !== "All") result = result.filter((m) => m.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      if (sortBy === "name") return (a.name ?? "").localeCompare(b.name ?? "");
      if (sortBy === "doubts") return b._count.managedDoubts - a._count.managedDoubts;
      if (sortBy === "replies") return b._count.doubtReplies - a._count.doubtReplies;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [active, search, roleFilter, sortBy]);

  const totalDoubts = active.reduce((a, m) => a + m._count.managedDoubts, 0);
  const weekResolved = active.reduce((a, m) => a + m.managedDoubts.length, 0);
  const mentorOnly = active.filter((m) => m.role === "MENTOR").length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1300px] space-y-8 px-4 py-10 sm:px-6 lg:px-10">

        {/* Hero Banner */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#5b21b6] via-[#7c3aed] to-[#a78bfa] px-8 py-10 text-white shadow-[0_24px_64px_rgba(124,58,237,0.3)]">
            <motion.div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />Team Management
                </span>
                <h1 className="mt-4 text-[32px] font-bold leading-tight tracking-tight sm:text-[38px]">Mentors & Instructors</h1>
                <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/75">
                  Manage mentor accounts, approve teacher registrations, assign goals, and track performance.
                </p>
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-3">
                {[
                  { label: "Active Members", value: loading ? "—" : active.length },
                  { label: "Pending Approval", value: loading ? "—" : pending.length },
                  { label: "Doubts Handled", value: loading ? "—" : totalDoubts },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/15 px-4 py-3 text-center backdrop-blur-sm">
                    <p className="text-[22px] font-bold">{s.value}</p>
                    <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </RevealSection>

        {/* ── Pending Teacher Requests ── */}
        {(loading || pending.length > 0) && (
          <section className="overflow-hidden rounded-[28px] border-2 border-[#facc15]/40 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#facc15]/30 bg-[#fffbeb] px-6 py-4">
              <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#facc15]/30">
                <AlertCircle className="h-4 w-4 text-[#92400e]" />
              </div>
              <div className="flex-1">
                <h2 className="text-[16px] font-bold text-[#111827]">Pending Teacher Requests</h2>
                <p className="text-[12px] text-[#a16207]">
                  {loading ? "Loading…" : `${pending.length} teacher${pending.length !== 1 ? "s" : ""} awaiting activation`}
                  {" — "}Generate an OTP or set a password to activate their account
                </p>
              </div>
              {pending.length > 0 && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#facc15] text-[13px] font-black text-[#1a1a1a]">
                  {pending.length}
                </span>
              )}
            </div>
            <div className="p-5">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1,2].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : pending.length === 0 ? (
                <div className="flex items-center justify-center gap-3 py-8 text-[14px] text-[#9ca3af]">
                  <UserCheck className="h-5 w-5 text-[#22c55e]" />
                  All caught up! No pending teacher registrations.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pending.map((mentor) => (
                    <PendingTeacherCard
                      key={mentor.id}
                      mentor={mentor}
                      onGenerateOtp={() => setModal({ type: "otp", mentor })}
                      onSetPassword={() => setModal({ type: "password", mentor })}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: "👥", label: "All Members", value: loading ? "…" : active.length, sub: "mentors + admins", color: "bg-violet-50 text-violet-600" },
            { icon: "🎓", label: "Active Mentors", value: loading ? "…" : mentorOnly, sub: "teaching role", color: "bg-blue-50 text-blue-600" },
            { icon: "🎯", label: "Doubts Handled", value: loading ? "…" : totalDoubts, sub: "all time", color: "bg-emerald-50 text-emerald-600" },
            { icon: "✅", label: "Resolved / Week", value: loading ? "…" : weekResolved, sub: "last 7 days", color: "bg-amber-50 text-amber-600" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="flex items-center gap-4 rounded-[20px] border border-[#eceef2] bg-white p-4 shadow-sm">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-[20px] font-bold text-[#101828]">{s.value}</p>
                <p className="text-[11px] text-[#667085]">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── Active Members Table ── */}
        <section className="overflow-hidden rounded-[28px] border border-[#eceef2] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#eef0f3] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[#101828]">Active Team Members</h2>
              <p className="text-[13px] text-[#667085]">{loading ? "Loading…" : `${filtered.length} of ${active.length} members`}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z" />
                </svg>
                <input type="text" placeholder="Search by name or email…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] pl-9 pr-4 text-[13px] outline-none focus:border-[#7c3aed] w-56" />
              </div>
              <div className="flex gap-1.5 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] p-1">
                {ROLES.map((r) => (
                  <button key={r} onClick={() => setRoleFilter(r)}
                    className={`rounded-lg px-3 py-1 text-[12px] font-semibold transition-all ${roleFilter === r ? "bg-[#7c3aed] text-white shadow-sm" : "text-[#667085] hover:text-[#101828]"}`}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 rounded-xl border border-[#e4e7ec] bg-[#f9fafb] px-3 text-[13px] text-[#667085] outline-none cursor-pointer">
                <option value="joined">Sort: Newest</option>
                <option value="name">Sort: Name</option>
                <option value="doubts">Sort: Most Doubts</option>
                <option value="replies">Sort: Most Replies</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#d7dbe2] bg-[#fafafa] py-16 text-center">
                <div className="mb-3 text-4xl">🔍</div>
                <p className="text-[15px] font-semibold text-[#344054]">No members found</p>
                <p className="mt-1 text-[13px] text-[#667085]">Try adjusting your search or role filter.</p>
                <button onClick={() => { setSearch(""); setRoleFilter("All"); }}
                  className="mt-4 rounded-xl bg-[#7c3aed] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6d28d9] transition-colors">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <Suspense fallback={<>{[1,2,3].map(i => <SkeletonCard key={i} />)}</>}>
                  {filtered.map((mentor, i) => (
                    <MentorCard
                      key={mentor.id}
                      mentor={mentor}
                      index={i}
                      onGenerateOtp={() => setModal({ type: "otp", mentor })}
                      onSetPassword={() => setModal({ type: "password", mentor })}
                    />
                  ))}
                </Suspense>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {modal?.type === "otp" && (
          <OtpPanel
            key="otp"
            mentorId={modal.mentor.id}
            teacherName={modal.mentor.name}
            teacherEmail={modal.mentor.email}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "password" && (
          <SetPasswordModal
            key="pw"
            mentorId={modal.mentor.id}
            teacherName={modal.mentor.name}
            teacherEmail={modal.mentor.email}
            onClose={() => setModal(null)}
            onSuccess={loadData}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
