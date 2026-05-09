"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#0f766e] via-[#0d9488] to-[#14b8a6] px-8 py-10 text-white shadow-[0_24px_60px_rgba(13,148,136,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                  Communications
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Announcements</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                  Broadcast messages to everyone, a role-based audience, or a hand-picked list of students.
                </p>
              </div>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="shrink-0 rounded-2xl bg-white px-6 py-3 text-[14px] font-semibold text-[#0f766e] transition hover:bg-white/90"
              >
                + New Announcement
              </button>
            </div>
          </section>
        </RevealSection>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <AdminStatCard index={0} title="Total" value={loading ? "…" : announcements.length} caption="All announcements ever sent." tone="sky" />
          <AdminStatCard index={1} title="Pinned" value={loading ? "…" : pinned} caption="Highlighted at the top." tone="emerald" />
          <AdminStatCard index={2} title="Direct" value={loading ? "…" : direct} caption="Sent to selected students only." tone="amber" />
        </StaggerGrid>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <section className="rounded-[28px] border border-[#ccfbf1] bg-[#f0fdfa] p-6">
                <h2 className="text-[18px] font-semibold text-[#0f766e]">New Announcement</h2>
                <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Title *</label>
                    <input required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Announcement title…"
                      className="h-12 w-full rounded-[14px] border border-[#99f6e4] bg-white px-4 text-[14px] outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Message *</label>
                    <textarea required rows={4} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} placeholder="Write your announcement…"
                      className="w-full rounded-[14px] border border-[#99f6e4] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Target Audience</label>
                    <select value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as AudienceOption }))}
                      className="h-12 w-full rounded-[14px] border border-[#99f6e4] bg-white px-4 text-[14px] outline-none focus:border-[#0d9488]">
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
                        className="h-5 w-5 accent-[#0d9488]" />
                      Pin at the top
                    </label>
                  </div>
                  {form.audience === "SELECTED_STUDENTS" && (
                    <div className="sm:col-span-2 rounded-[22px] border border-[#99f6e4] bg-white p-4">
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">
                            Select students
                          </label>
                          <input
                            value={studentQuery}
                            onChange={(e) => setStudentQuery(e.target.value)}
                            placeholder="Search by name or email…"
                            className="h-12 w-full rounded-[14px] border border-[#ccfbf1] bg-[#f8fffd] px-4 text-[14px] outline-none focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/15"
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
                                className="rounded-full bg-[#ccfbf1] px-3 py-1.5 text-[12px] font-semibold text-[#115e59] transition hover:bg-[#99f6e4]"
                              >
                                {student.name ?? student.email ?? "Student"} ×
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="max-h-60 overflow-y-auto rounded-[16px] border border-[#e6fffa] bg-[#fcfffe]">
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
                                className="flex w-full items-center justify-between gap-3 border-b border-[#f0fdfa] px-4 py-3 text-left transition last:border-b-0 hover:bg-[#f0fdfa]"
                              >
                                <div>
                                  <p className="text-[13px] font-semibold text-[#0f172a]">
                                    {student.name ?? "Unnamed student"}
                                  </p>
                                  <p className="text-[12px] text-[#64748b]">
                                    {student.email ?? "No email"}
                                  </p>
                                </div>
                                <span className="rounded-full bg-[#ccfbf1] px-2.5 py-1 text-[11px] font-semibold text-[#0f766e]">
                                  Add
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {error && <p className="sm:col-span-2 text-[13px] text-[#dc2626]">{error}</p>}
                  <div className="flex gap-3 sm:col-span-2">
                    <button type="submit" disabled={saving} className="rounded-[14px] bg-[#0d9488] px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-50 transition hover:bg-[#0f766e]">
                      {saving ? "Sending…" : "Send Announcement"}
                    </button>
                    <button type="button" onClick={() => setShowCreate(false)} className="rounded-[14px] bg-white px-6 py-3 text-[14px] font-semibold text-[#64748b] transition hover:bg-[#f1f5f9]">Cancel</button>
                  </div>
                </form>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* List */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">Sent Announcements</h2>
            </div>
            <div className="space-y-3 p-6">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)
              ) : announcements.length === 0 ? (
                <p className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-12 text-center text-[14px] text-[#667085]">
                  No announcements yet. Create your first one above.
                </p>
              ) : (
                announcements.map((a, i) => (
                  <motion.article
                    key={a.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {a.isPinned && <span className="rounded-full bg-[#fef9c3] px-2 py-0.5 text-[10px] font-bold text-[#a16207]">📌 PINNED</span>}
                          <p className="font-semibold text-[#101828]">{a.title}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-[#667085]">{a.body}</p>
                        {a._count.recipients > 0 && (
                          <p className="mt-2 text-[12px] font-medium text-[#0f766e]">
                            Direct to {recipientPreview(a)}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f0fdfa] px-3 py-1 text-[11px] font-semibold text-[#0f766e]">
                        {targetLabel(a)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-[12px] text-[#94a3b8]">
                      <span>by {a.author.name ?? "Admin"}</span>
                      <span>{formatShortDate(a.createdAt)}</span>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </section>
        </RevealSection>
      </div>
    </PageTransition>
  );
}
