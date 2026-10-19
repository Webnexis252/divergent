"use client";

import { useEffect, useState } from "react";
import { m as motion, AnimatePresence } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../../_components/AdminStatCard";
import { formatShortDate } from "@/lib/date-format";
import { Check, Crown, Shield, ShieldCheck, UserCog, Users } from "lucide-react";
import { SegmentedControl } from "@/app/dashboard/_components/segmented-control";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButton,
  adminButtonSm,
  adminInputClass,
} from "../../_components/admin-ui";

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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Owner controls"
            icon={Shield}
            title="Admin accounts"
            description="Grant and revoke admin access. Only super admins can manage this list."
            actions={
              <button
                type="button"
                onClick={() => { setShowCreate(!showCreate); setError(""); setSuccess(""); }}
                className={showCreate ? adminButton.secondary : adminButton.primary}
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                {showCreate ? "Close panel" : "Manage admins"}
              </button>
            }
          />
        </RevealSection>

        {/* Success/error banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-[14px] border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] font-medium text-[#15803d]"
            >
              <Check className="mr-1.5 inline h-4 w-4 align-[-3px]" />{success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <StaggerGrid className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminStatCard index={0} title="Super admins" value={loading ? "…" : superAdmins.length} caption="Owners with full system access." icon={<Crown />} tone="amber" />
          <AdminStatCard index={1} title="Admins" value={loading ? "…" : regularAdmins.length} caption="Platform managers." icon={<ShieldCheck />} tone="sky" />
          <AdminStatCard index={2} title="Total staff" value={loading ? "…" : admins.length} caption="All admin-level accounts." icon={<Users />} tone="slate" />
        </StaggerGrid>

        {/* Manage panel */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <RevealSection>
                <AdminPanel>
                  <AdminPanelHeader
                    icon={UserCog}
                    tone="amber"
                    title="Manage admin accounts"
                    description="Create a new admin, or promote an existing student or mentor"
                    actions={
                      <SegmentedControl
                        size="sm"
                        ariaLabel="How to add an admin"
                        value={mode}
                        onChange={setMode}
                        options={[
                          { id: "create", label: "Create new" },
                          { id: "promote", label: "Promote existing" },
                        ]}
                      />
                    }
                  />

                  {mode === "create" ? (
                    <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-3">
                      {[
                        { label: "Full Name *", key: "name", type: "text", placeholder: "Jane Doe" },
                        { label: "Email *", key: "email", type: "email", placeholder: "jane@example.com" },
                        { label: "Password *", key: "password", type: "password", placeholder: "min. 8 characters" },
                      ].map((f) => (
                        <div key={f.key}>
                          <label className="mb-1.5 block text-[12px] font-semibold text-[#475569]">{f.label}</label>
                          <input
                            required
                            type={f.type}
                            placeholder={f.placeholder}
                            value={form[f.key as keyof typeof form]}
                            onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                            className={adminInputClass}
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
                              className="mt-2 text-[12px] font-semibold text-[#0369a1] underline underline-offset-4 hover:text-[#0c4a6e]"
                            >
                              Promote this existing user to Admin instead?
                            </button>
                          )}
                        </div>
                      )}
                      <div className="flex gap-3 sm:col-span-3">
                        <button type="submit" disabled={saving} className={adminButton.primary}>
                          {saving ? "Creating…" : "Create admin"}
                        </button>
                        <button type="button" onClick={() => setShowCreate(false)} className={adminButton.secondary}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="mb-1.5 block text-[12px] font-semibold text-[#475569]">Search students and mentors</label>
                        <input
                          type="text"
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={adminInputClass}
                        />
                      </div>

                      <div className="max-h-[240px] space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {searching ? (
                          <p className="py-4 text-center text-[13px] text-[#64748b]">Searching...</p>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedUserIds(prev => 
                                  prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id]
                                );
                              }}
                              className={`flex w-full items-center justify-between gap-4 rounded-[14px] border p-3 transition-colors ${selectedUserIds.includes(user.id) ? "border-[#209bd2] bg-[#f0f9ff]" : "border-[#eef1f5] bg-white hover:bg-[#f8fafc]"}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="grid h-8 w-8 place-items-center rounded-full bg-[#f1f5f9] text-[12px] font-semibold text-[#334155]">
                                  {(user.name ?? "U")[0].toUpperCase()}
                                </div>
                                <div className="text-left">
                                  <p className="text-[13px] font-semibold text-[#0f172a]">{user.name ?? "Unnamed"}</p>
                                  <p className="text-[11px] text-[#64748b]">{user.email}</p>
                                </div>
                              </div>
                              <StatusBadge>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</StatusBadge>
                            </button>
                          ))
                        ) : searchQuery.length >= 2 ? (
                          <p className="py-4 text-center text-[13px] text-[#64748b]">No non-admin users found.</p>
                        ) : (
                          <p className="py-4 text-center text-[13px] text-[#94a3b8]">Type at least 2 characters to search.</p>
                        )}
                      </div>

                      {error && <p className="text-[13px] text-[#dc2626]">{error}</p>}
                      
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[12px] font-medium text-[#64748b]">
                          {selectedUserIds.length} user(s) selected
                        </p>
                        <div className="flex gap-3">
                          <button 
                            onClick={handlePromote}
                            disabled={saving || selectedUserIds.length === 0} 
                            className={adminButton.primary}
                          >
                            {saving ? "Promoting…" : "Make admin"}
                          </button>
                          <button type="button" onClick={() => setShowCreate(false)} className={adminButton.secondary}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </AdminPanel>
              </RevealSection>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin list */}
        <RevealSection>
          <AdminPanel>
            <AdminPanelHeader icon={Users} tone="slate" title="Admin roster" description="Everyone with admin-level access" />
            <div className="mt-5 divide-y divide-[#f1f5f9]">
              {loading ? (
                [1, 2, 3].map((i) => <div key={i} className="my-2 h-14 animate-pulse rounded-[14px] bg-[#f1f5f9]" />)
              ) : admins.length === 0 ? (
                <AdminEmptyState icon={Users} title="No admin accounts" />
              ) : (
                admins.map((admin, i) => (
                  <motion.article
                    key={admin.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex flex-wrap items-center justify-between gap-4 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1f5f9] text-[13px] font-semibold text-[#334155]">
                        {(admin.name ?? admin.email ?? "A")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="truncate text-[14px] font-semibold text-[#0f172a]">{admin.name ?? "Unnamed"}</p>
                        <p className="truncate text-[12px] text-[#64748b]">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge tone={admin.role === "SUPER_ADMIN" ? "warning" : "info"} icon={admin.role === "SUPER_ADMIN" ? Crown : ShieldCheck}>
                        {admin.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                      </StatusBadge>
                      <span className="text-[12px] text-[#94a3b8]">{formatShortDate(admin.createdAt)}</span>
                      {admin.role === "ADMIN" && (
                        <button
                          onClick={() => handleRevoke(admin.id)}
                          disabled={revoking === admin.id}
                          className={adminButtonSm.danger}
                        >
                          {revoking === admin.id ? "Revoking…" : "Revoke"}
                        </button>
                      )}
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
