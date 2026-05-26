"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";

type Admin = {
  id: string;
  name: string | null;
  email: string | null;
  role: "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
  image: string | null;
};

type UserSearchResult = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const [mode, setMode] = useState<"create" | "promote">("create");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/api/super-admin/admins")
      .then((r) => r.json())
      .then((p) => { if (p.success) setAdmins(p.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (mode !== "promote" || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/super-admin/users?search=${searchQuery}`);
        const p = await res.json();
        if (p.success) setSearchResults(p.data);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to create admin"); return; }
      setAdmins((prev) => [...prev, p.data]);
      setForm({ name: "", email: "", password: "" });
      setShowCreate(false);
      setSuccess("Admin account created successfully.");
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  async function handlePromote() {
    if (selectedUserIds.length === 0) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await fetch("/api/super-admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to promote users"); return; }
      
      // Update local state: add the newly promoted users
      // The API returns an array of promoted users in p.data
      const promoted = Array.isArray(p.data) ? p.data : [p.data];
      setAdmins((prev) => [...prev, ...promoted]);
      
      setSelectedUserIds([]);
      setSearchQuery("");
      setSearchResults([]);
      setShowCreate(false);
      setSuccess(`${promoted.length} user(s) promoted to Admin.`);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  async function handleRevoke(userId: string) {
    setRevoking(userId);
    try {
      const res = await fetch(`/api/super-admin/admins?userId=${userId}`, { method: "DELETE" });
      const p = await res.json();
      if (p.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== userId));
        setSuccess("Admin access revoked.");
      }
    } catch { /* silent */ }
    finally { setRevoking(null); }
  }

  const superAdmins = admins.filter((a) => a.role === "SUPER_ADMIN");
  const regularAdmins = admins.filter((a) => a.role === "ADMIN");

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#475569] px-8 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.30)]">
            <motion.div
              className="pointer-events-none absolute -right-12 -top-10 h-52 w-52 rounded-full bg-[#fbbf24]/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="inline-flex rounded-full bg-[#fbbf24]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#fde68a]">
                  Owner Controls
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Admin Accounts</h1>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/80">
                  Grant and revoke admin access. Only super admins can manage this list.
                </p>
              </div>
              <button
                onClick={() => { setShowCreate(!showCreate); setError(""); setSuccess(""); }}
                className="shrink-0 rounded-2xl bg-[#fbbf24] px-6 py-3 text-[14px] font-semibold text-[#1e293b] transition hover:bg-[#f59e0b]"
              >
                {showCreate ? "Close Panel" : "+ Manage Admins"}
              </button>
            </div>
          </section>
        </RevealSection>

        {/* Success/error banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-[16px] bg-[#f0fdf4] border border-[#bbf7d0] px-5 py-4 text-[14px] font-medium text-[#15803d]"
            >
              ✓ {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <AdminStatCard index={0} title="Super Admins" value={loading ? "…" : superAdmins.length} caption="Owners with full system access." tone="amber" />
          <AdminStatCard index={1} title="Admins" value={loading ? "…" : regularAdmins.length} caption="Platform managers." tone="sky" />
          <AdminStatCard index={2} title="Total Staff" value={loading ? "…" : admins.length} caption="All admin-level accounts." tone="slate" />
        </StaggerGrid>

        {/* Manage panel */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <RevealSection>
                <section className="rounded-[28px] border border-[#fde68a]/50 bg-[#fffbeb] p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[18px] font-semibold text-[#92400e]">Manage Admin Accounts</h2>
                    <div className="flex gap-1 rounded-xl bg-white/50 p-1">
                      <button 
                        onClick={() => setMode("create")}
                        className={`rounded-lg px-4 py-1.5 text-[12px] font-semibold transition ${mode === "create" ? "bg-[#fbbf24] text-[#1e293b]" : "text-[#92400e] hover:bg-white/80"}`}
                      >
                        Create New
                      </button>
                      <button 
                        onClick={() => setMode("promote")}
                        className={`rounded-lg px-4 py-1.5 text-[12px] font-semibold transition ${mode === "promote" ? "bg-[#fbbf24] text-[#1e293b]" : "text-[#92400e] hover:bg-white/80"}`}
                      >
                        Promote Existing
                      </button>
                    </div>
                  </div>

                  {mode === "create" ? (
                    <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-3">
                      {[
                        { label: "Full Name *", key: "name", type: "text", placeholder: "Jane Doe" },
                        { label: "Email *", key: "email", type: "email", placeholder: "jane@example.com" },
                        { label: "Password *", key: "password", type: "password", placeholder: "min. 8 characters" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">{f.label}</label>
                          <input
                            required
                            type={f.type}
                            placeholder={f.placeholder}
                            value={form[f.key as keyof typeof form]}
                            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                            className="h-12 w-full rounded-[14px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                          />
                        </div>
                      ))}
                      {error && (
                        <div className="sm:col-span-3">
                          <p className="text-[13px] font-medium text-[#dc2626]">{error}</p>
                          {error.includes("already exists") && (
                            <button
                              type="button"
                              onClick={() => {
                                setMode("promote");
                                setSearchQuery(form.email);
                                setError("");
                              }}
                              className="mt-2 text-[12px] font-bold text-[#92400e] underline decoration-[#fbbf24] underline-offset-4 hover:text-[#b45309]"
                            >
                              Promote this existing user to Admin instead?
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-3 sm:col-span-3">
                        <button type="submit" disabled={saving} className="rounded-[14px] bg-[#0f172a] px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-50 transition hover:bg-[#1e293b]">
                          {saving ? "Creating…" : "Create Admin"}
                        </button>
                        <button type="button" onClick={() => setShowCreate(false)} className="rounded-[14px] bg-white px-6 py-3 text-[14px] font-semibold text-[#64748b] transition hover:bg-[#f1f5f9]">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">Search Users (Students/Mentors)</label>
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="h-12 w-full rounded-[14px] border border-[#fde68a] bg-white px-4 text-[14px] outline-none focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/15"
                        />
                      </div>

                      <div className="max-h-[240px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {searching ? (
                          <p className="py-4 text-center text-[13px] text-[#92400e]">Searching...</p>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedUserIds(prev => 
                                  prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                );
                              }}
                              className={`flex w-full items-center justify-between gap-4 rounded-[14px] border p-3 transition ${selectedUserIds.includes(user.id) ? "border-[#f59e0b] bg-[#fef3c7]" : "border-transparent bg-white hover:bg-white/80"}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-200 text-xs font-bold text-slate-600">
                                  {(user.name ?? "U")[0].toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="text-[13px] font-semibold text-[#0f172a]">{user.name ?? "Unnamed"}</p>
                                  <p className="text-[11px] text-[#64748b]">{user.email}</p>
                                </div>
                              </div>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{user.role}</span>
                            </button>
                          ))
                        ) : searchQuery.length >= 2 ? (
                          <p className="py-4 text-center text-[13px] text-[#92400e]">No non-admin users found.</p>
                        ) : (
                          <p className="py-4 text-center text-[13px] text-[#94a3b8]">Type at least 2 characters to search.</p>
                        )}
                      </div>

                      {error && <p className="text-[13px] text-[#dc2626]">{error}</p>}
                      
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[12px] font-medium text-[#92400e]">
                          {selectedUserIds.length} user(s) selected
                        </p>
                        <div className="flex gap-3">
                          <button 
                            onClick={handlePromote}
                            disabled={saving || selectedUserIds.length === 0} 
                            className="rounded-[14px] bg-[#0f172a] px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-50 transition hover:bg-[#1e293b]"
                          >
                            {saving ? "Promoting…" : "Make Admin(s)"}
                          </button>
                          <button type="button" onClick={() => setShowCreate(false)} className="rounded-[14px] bg-white px-6 py-3 text-[14px] font-semibold text-[#64748b] transition hover:bg-[#f1f5f9]">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </RevealSection>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin list */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="border-b border-[#eef0f3] px-6 py-5">
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">Admin Roster</h2>
            </div>
            <div className="space-y-3 p-6">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-[18px] bg-[#f3f4f6]" />)
              ) : admins.length === 0 ? (
                <p className="text-center text-[14px] text-[#667085]">No admin accounts.</p>
              ) : (
                admins.map((admin, i) => (
                  <motion.article
                    key={admin.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between gap-4 rounded-[18px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-[#1e293b] to-[#475569] text-sm font-bold text-white">
                        {(admin.name ?? admin.email ?? "A")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-[#101828]">{admin.name ?? "Unnamed"}</p>
                        <p className="text-[13px] text-[#667085]">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${admin.role === "SUPER_ADMIN" ? "bg-[#fef9c3] text-[#a16207]" : "bg-[#eff6ff] text-[#1d4ed8]"}`}>
                        {admin.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
                      </span>
                      <span className="text-[12px] text-[#94a3b8]">{formatShortDate(admin.createdAt)}</span>
                      {admin.role === "ADMIN" && (
                        <button
                          onClick={() => handleRevoke(admin.id)}
                          disabled={revoking === admin.id}
                          className="rounded-[12px] bg-[#fff1f2] px-3 py-1.5 text-[12px] font-semibold text-[#dc2626] transition hover:bg-[#fee2e2] disabled:opacity-50"
                        >
                          {revoking === admin.id ? "Revoking…" : "Revoke"}
                        </button>
                      )}
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
