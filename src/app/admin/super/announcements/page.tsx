"use client";

import { useEffect, useState } from "react";
import { m as motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import { Inbox, Megaphone, Pin, Plus, Send, Users } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButton,
  adminInputClass,
  adminLabelClass,
  adminRowClass,
  adminTextareaClass,
} from "../../_components/admin-ui";

type AudienceOption =
  | "EVERYONE"
  | "STUDENT"
  | "MENTOR"
  | "ADMIN"
  | "SUPER_ADMIN"
  | "SELECTED_STUDENTS";

type StudentOption = {
  id: string;
  name: string | null;
  email: string | null;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  targetRole: string | null;
  targetCourseId: string | null;
  isPinned: boolean;
  createdAt: string;
  author: { name: string | null; image: string | null };
  recipients: Array<{
    user: StudentOption;
  }>;
  _count: {
    recipients: number;
  };
};

const audienceLabels: Record<AudienceOption, string> = {
  EVERYONE: "Everyone",
  STUDENT: "Students only",
  MENTOR: "Mentors only",
  ADMIN: "Admins only",
  SUPER_ADMIN: "Super admins only",
  SELECTED_STUDENTS: "Selected students only",
};

function roleLabel(role: string) {
  return audienceLabels[role as AudienceOption] ?? role.replaceAll("_", " ").toLowerCase();
}

function targetLabel(announcement: Announcement) {
  if (announcement._count.recipients > 0) {
    return announcement._count.recipients === 1
      ? "1 selected student"
      : `${announcement._count.recipients} selected students`;
  }

  if (!announcement.targetRole) return "Everyone";
  return roleLabel(announcement.targetRole);
}

function recipientPreview(announcement: Announcement) {
  const names = announcement.recipients
    .map(({ user }) => user.name ?? user.email ?? "Student")
    .filter(Boolean);

  if (names.length === 0) return "";

  const extraCount = announcement._count.recipients - names.length;
  return extraCount > 0
    ? `${names.join(", ")} +${extraCount} more`
    : names.join(", ");
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "EVERYONE" as AudienceOption,
    isPinned: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((p) => { if (p.success) setAnnouncements(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!showCreate || form.audience !== "SELECTED_STUDENTS") {
      setStudentOptions([]);
      setSearchingStudents(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearchingStudents(true);

      try {
        const params = new URLSearchParams();
        if (studentQuery.trim()) {
          params.set("search", studentQuery.trim());
        }

        const res = await fetch(`/api/admin/students?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await res.json();

        if (!res.ok || !payload.success) {
          setStudentOptions([]);
          return;
        }

        const selectedIds = new Set(selectedStudents.map((student) => student.id));
        const options = (payload.data.students as StudentOption[]).filter(
          (student) => !selectedIds.has(student.id)
        );
        setStudentOptions(options);
      } catch {
        if (!controller.signal.aborted) {
          setStudentOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingStudents(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [form.audience, selectedStudents, showCreate, studentQuery]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");

    if (form.audience === "SELECTED_STUDENTS" && selectedStudents.length === 0) {
      setSaving(false);
      setError("Select at least one student for a direct announcement.");
      return;
    }

    try {
      const body = {
        title: form.title,
        body: form.body,
        isPinned: form.isPinned,
        ...(form.audience !== "EVERYONE" &&
        form.audience !== "SELECTED_STUDENTS" && { targetRole: form.audience }),
        ...(form.audience === "SELECTED_STUDENTS" && {
          selectedStudentIds: selectedStudents.map((student) => student.id),
        }),
      };
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create"); return; }
      setAnnouncements((prev) => [p.data, ...prev]);
      setForm({ title: "", body: "", audience: "EVERYONE", isPinned: false });
      setStudentQuery("");
      setStudentOptions([]);
      setSelectedStudents([]);
      setShowCreate(false);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  const pinned = announcements.filter((a) => a.isPinned).length;
  const direct = announcements.filter((a) => a._count.recipients > 0).length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Communications"
            icon={Megaphone}
            title="Announcements"
            description="Broadcast messages to everyone, a role-based audience, or a hand-picked list of students."
            actions={
              <button type="button" onClick={() => setShowCreate(!showCreate)} className={showCreate ? adminButton.secondary : adminButton.primary}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {showCreate ? "Close" : "New announcement"}
              </button>
            }
          />
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminStatCard index={0} title="Total sent" value={loading ? "…" : announcements.length} caption="All announcements ever sent." icon={<Megaphone />} tone="sky" />
          <AdminStatCard index={1} title="Pinned" value={loading ? "…" : pinned} caption="Highlighted at the top." icon={<Pin />} tone="emerald" />
          <AdminStatCard index={2} title="Direct" value={loading ? "…" : direct} caption="Sent to selected students only." icon={<Users />} tone="amber" />
        </StaggerGrid>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <AdminPanel>
                <AdminPanelHeader icon={Send} tone="sky" title="New announcement" description="Choose who receives it, then send" />
                <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={adminLabelClass}>Title *</label>
                    <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Announcement title…"
                      className={adminInputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={adminLabelClass}>Message *</label>
                    <textarea required rows={4} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Write your announcement…"
                      className={adminTextareaClass} />
                  </div>
                  <div>
                    <label className={adminLabelClass}>Target Audience</label>
                    <select value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as AudienceOption }))}
                      className={adminInputClass}>
                      <option value="EVERYONE">Everyone</option>
                      <option value="STUDENT">Students only</option>
                      <option value="MENTOR">Mentors only</option>
                      <option value="ADMIN">Admins only</option>
                      <option value="SUPER_ADMIN">Super admins only</option>
                      <option value="SELECTED_STUDENTS">Selected students only</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex cursor-pointer items-center gap-3 text-[14px] font-medium text-[#0f172a]">
                      <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
                        className="h-4 w-4 accent-[#209bd2]" />
                      Pin at the top
                    </label>
                  </div>
                  {form.audience === "SELECTED_STUDENTS" && (
                    <div className="sm:col-span-2 rounded-[16px] border border-[#eef1f5] bg-[#f8fafc] p-4">
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className={adminLabelClass}>
                            Select students
                          </label>
                          <input
                            value={studentQuery}
                            onChange={(e) => setStudentQuery(e.target.value)}
                            placeholder="Search by name or email…"
                            className={adminInputClass}
                          />
                        </div>

                        {selectedStudents.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedStudents.map((student) => (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudents((prev) =>
                                    prev.filter((entry) => entry.id !== student.id)
                                  );
                                }}
                                className="rounded-full border border-[#bae6fd] bg-[#f0f9ff] px-3 py-1 text-[12px] font-semibold text-[#0369a1] transition-colors hover:bg-[#e0f2fe]"
                              >
                                {student.name ?? student.email ?? "Student"} ×
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="max-h-60 overflow-y-auto rounded-[12px] border border-[#e2e8f0] bg-white">
                          {searchingStudents ? (
                            <p className="px-4 py-3 text-[13px] text-[#64748b]">Searching students…</p>
                          ) : studentOptions.length === 0 ? (
                            <p className="px-4 py-3 text-[13px] text-[#64748b]">
                              {studentQuery.trim()
                                ? "No matching students found."
                                : "Start typing or pick from the latest students."}
                            </p>
                          ) : (
                            studentOptions.map((student) => (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => {
                                  setSelectedStudents((prev) => [...prev, student]);
                                  setStudentQuery("");
                                }}
                                className="flex w-full items-center justify-between gap-3 border-b border-[#f1f5f9] px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#f8fafc]"
                              >
                                <div>
                                  <p className="text-[13px] font-semibold text-[#0f172a]">
                                    {student.name ?? "Unnamed student"}
                                  </p>
                                  <p className="text-[12px] text-[#64748b]">
                                    {student.email ?? "No email"}
                                  </p>
                                </div>
                                <StatusBadge tone="info" icon={Plus}>Add</StatusBadge>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {error && <p className="sm:col-span-2 text-[13px] text-[#dc2626]">{error}</p>}
                  <div className="flex gap-3 sm:col-span-2">
                    <button type="submit" disabled={saving} className={adminButton.primary}>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      {saving ? "Sending…" : "Send announcement"}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)} className={adminButton.secondary}>Cancel</button>
                  </div>
                </form>
              </AdminPanel>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <RevealSection>
          <AdminPanel>
            <AdminPanelHeader icon={Inbox} tone="slate" title="Sent announcements" description="Newest first" />
            <div className="mt-5 space-y-3">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-[16px] bg-[#f1f5f9]" />)
              ) : announcements.length === 0 ? (
                <AdminEmptyState icon={Megaphone} title="No announcements yet" description="Create your first one with New announcement." />
              ) : (
                announcements.map((a, i) => (
                  <motion.article
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className={adminRowClass}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {a.isPinned && <StatusBadge tone="warning" icon={Pin}>Pinned</StatusBadge>}
                          <p className="text-[14px] font-semibold text-[#0f172a]">{a.title}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-[#64748b]">{a.body}</p>
                        {a._count.recipients > 0 && (
                          <p className="mt-2 text-[12px] font-medium text-[#0369a1]">
                            Direct to {recipientPreview(a)}
                          </p>
                        )}
                      </div>
                      <StatusBadge tone="info">{targetLabel(a)}</StatusBadge>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-[#94a3b8]">
                      <span>by {a.author.name ?? "Admin"}</span>
                      <span>{formatShortDate(a.createdAt)}</span>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </AdminPanel>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
