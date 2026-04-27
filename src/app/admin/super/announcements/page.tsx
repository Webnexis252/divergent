"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

type Announcement = {
  id: string;
  title: string;
  body: string;
  targetRole: string | null;
  targetCourseId: string | null;
  isPinned: boolean;
  createdAt: string;
  author: { name: string | null; image: string | null };
};

const targetLabel = (role: string | null) => {
  if (!role) return "Everyone";
  return role.charAt(0) + role.slice(1).toLowerCase();
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", targetRole: "", isPinned: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then((r) => r.json())
      .then((p) => { if (p.success) setAnnouncements(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      const body = {
        title: form.title,
        body: form.body,
        isPinned: form.isPinned,
        ...(form.targetRole && { targetRole: form.targetRole }),
      };
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create"); return; }
      setAnnouncements((prev) => [p.data, ...prev]);
      setForm({ title: "", body: "", targetRole: "", isPinned: false });
      setShowCreate(false);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  const pinned = announcements.filter((a) => a.isPinned).length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
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
                  Broadcast messages to students, mentors or the whole platform.
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
          <AdminStatCard index={2} title="Global" value={loading ? "…" : announcements.filter((a) => !a.targetRole).length} caption="Visible to all users." tone="amber" />
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
                    <select value={form.targetRole} onChange={(e) => setForm((p) => ({ ...p, targetRole: e.target.value }))}
                      className="h-12 w-full rounded-[14px] border border-[#99f6e4] bg-white px-4 text-[14px] outline-none focus:border-[#0d9488]">
                      <option value="">Everyone</option>
                      <option value="STUDENT">Students only</option>
                      <option value="MENTOR">Mentors only</option>
                      <option value="ADMIN">Admins only</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex cursor-pointer items-center gap-3 text-[14px] font-medium text-[#0f172a]">
                      <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
                        className="h-5 w-5 accent-[#0d9488]" />
                      Pin at the top
                    </label>
                  </div>
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
                      </div>
                      <span className="shrink-0 rounded-full bg-[#f0fdfa] px-3 py-1 text-[11px] font-semibold text-[#0f766e]">
                        {targetLabel(a.targetRole)}
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
