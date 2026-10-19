"use client";

import { useEffect, useState, lazy, Suspense, useMemo } from "react";
import { m as motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { SegmentedControl } from "@/app/dashboard/_components/segmented-control";
import { AdminStatCard } from "../_components/AdminStatCard";
import { AdminToast } from "../_components/AdminToast";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminInputClass,
} from "../_components/admin-ui";
import { Clock, KeyRound, Lock, UserCheck, AlertCircle, Users, GraduationCap, Target, CircleCheck, Search, SearchX } from "lucide-react";
import type { Mentor } from "./_types";
import { OtpPanel, SetPasswordModal } from "./TeacherSecurityModals";

const MentorCard = lazy(() => import("./MentorCard").then((m) => ({ default: m.MentorCard })));

const ROLES = ["All", "MENTOR", "ADMIN", "SUPER_ADMIN"];
const ROLE_LABELS: Record<string, string> = { All: "All", MENTOR: "Mentors", ADMIN: "Admins", SUPER_ADMIN: "Super admins" };

type ModalState =
  | { type: "otp"; mentor: Mentor }
  | { type: "password"; mentor: Mentor }
  | null;

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[20px] border border-[#eef1f5] bg-white">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#eef1f5]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-[#eef1f5]" />
            <div className="h-3 w-24 rounded bg-[#f1f5f9]" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-[#f1f5f9]" />)}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-xl bg-[#f1f5f9]" />
          <div className="h-10 rounded-xl bg-[#f1f5f9]" />
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
      className="overflow-hidden rounded-[18px] border border-[#fde68a] bg-white"
    >
      <div className="flex items-start gap-4 p-5">
        {/* Avatar */}
        {mentor.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mentor.image} alt={mentor.name ?? "Teacher"} className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#fef3c7] text-[13px] font-semibold text-[#b45309]">
            {initials}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="truncate text-[14px] font-semibold text-[#0f172a]">{mentor.name ?? "Unnamed"}</p>
              <p className="truncate text-[12px] text-[#64748b]">{mentor.email}</p>
            </div>
            <StatusBadge tone="warning" icon={Clock}>Pending</StatusBadge>
          </div>

          <p className="mt-2 text-[12px] text-[#94a3b8]">
            Registered {new Date(mentor.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 border-t border-[#f1f5f9] px-4 py-3">
        <button type="button" onClick={onGenerateOtp} className={adminButtonSm.primary}>
          <KeyRound className="h-3.5 w-3.5" /> Generate OTP
        </button>
        <button type="button" onClick={onSetPassword} className={adminButtonSm.secondary}>
          <Lock className="h-3.5 w-3.5" /> Set password
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
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  const handleSuspendTeacher = async (mentorId: string) => {
    if (!confirm("Are you sure you want to suspend this teacher account?")) return;
    try {
      const res = await fetch(`/api/admin/mentors/${mentorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUSPENDED" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToast({ msg: data.error || "Failed to suspend teacher", ok: false });
      } else {
        setToast({ msg: data.message || "Teacher suspended", ok: true });
        loadData();
      }
    } catch {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

  const handleDeleteTeacher = async (mentorId: string) => {
    if (!confirm("Are you sure you want to request deletion for this teacher? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/mentors/${mentorId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setToast({ msg: data.error || "Failed to delete teacher", ok: false });
      } else {
        setToast({ msg: data.message || "Teacher deleted", ok: true });
        loadData();
      }
    } catch {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setTimeout(() => setToast(null), 3500);
    }
  };

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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Team management"
            icon={GraduationCap}
            title="Mentors & instructors"
            description="Manage mentor accounts, approve teacher registrations, assign goals and track performance."
          />
        </RevealSection>

        {/* ── Summary Stats ── */}
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard index={0} title="All members" value={loading ? "…" : active.length} caption="Mentors and admins with access." icon={<Users />} tone="slate" />
          <AdminStatCard index={1} title="Active mentors" value={loading ? "…" : mentorOnly} caption="Members in a teaching role." icon={<GraduationCap />} tone="sky" />
          <AdminStatCard index={2} title="Doubts handled" value={loading ? "…" : totalDoubts} caption="All time, across the team." icon={<Target />} tone="emerald" />
          <AdminStatCard index={3} title="Resolved this week" value={loading ? "…" : weekResolved} trend={!loading && pending.length > 0 ? `${pending.length} pending` : undefined} caption="Doubts closed in the last 7 days." icon={<CircleCheck />} tone="amber" />
        </StaggerGrid>

        {/* ── Pending Teacher Requests ── */}
        {(loading || pending.length > 0) && (
          <AdminPanel>
            <AdminPanelHeader
              icon={AlertCircle}
              tone="amber"
              title="Pending teacher requests"
              description={
                loading
                  ? "Loading…"
                  : `${pending.length} teacher${pending.length !== 1 ? "s" : ""} awaiting activation. Generate an OTP or set a password to activate them.`
              }
              actions={pending.length > 0 ? <StatusBadge tone="warning">{pending.length} waiting</StatusBadge> : null}
            />
            <div className="mt-5">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1,2].map(i => <SkeletonCard key={i} />)}
                </div>
              ) : pending.length === 0 ? (
                <AdminEmptyState icon={UserCheck} title="All caught up" description="No pending teacher registrations." />
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
          </AdminPanel>
        )}

        {/* ── Active Members ── */}
        <AdminPanel>
          <AdminPanelHeader
            icon={Users}
            tone="sky"
            title="Active team members"
            description={loading ? "Loading…" : `${filtered.length} of ${active.length} members`}
          />

          <div className="mt-5 flex flex-col gap-3 rounded-[16px] border border-[#eef1f5] bg-[#f8fafc] p-3 lg:flex-row lg:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search members</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" aria-hidden="true" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${adminInputClass} pl-10`}
              />
            </label>
            <SegmentedControl
              ariaLabel="Filter by role"
              value={roleFilter}
              onChange={setRoleFilter}
              options={ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r] }))}
            />
            <label className="lg:w-52">
              <span className="sr-only">Sort members</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className={adminInputClass}>
                <option value="joined">Sort: Newest</option>
                <option value="name">Sort: Name</option>
                <option value="doubts">Sort: Most doubts</option>
                <option value="replies">Sort: Most replies</option>
              </select>
            </label>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <AdminEmptyState
                icon={SearchX}
                title="No members found"
                description="Try adjusting your search or role filter."
                action={
                  <button type="button" onClick={() => { setSearch(""); setRoleFilter("All"); }} className={adminButton.secondary}>
                    Clear filters
                  </button>
                }
              />
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
                      onSuspend={handleSuspendTeacher}
                      onDelete={handleDeleteTeacher}
                    />
                  ))}
                </Suspense>
              </div>
            )}
          </div>
        </AdminPanel>
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

      <AdminToast toast={toast} />
    </PageTransition>
  );
}
