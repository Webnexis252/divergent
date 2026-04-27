"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { formatShortDate } from "@/lib/date-format";

type Settings = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  gstNumber: string | null;
  updatedAt: string;
};

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Partial<Settings>>({});

  useEffect(() => {
    fetch("/api/super-admin/settings")
      .then((r) => r.json())
      .then((p) => {
        if (p.success) {
          setSettings(p.data);
          setForm(p.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const p = await res.json();
      if (!res.ok || !p.success) { setError(p.error ?? "Failed to save"); return; }
      setSettings(p.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Network error"); }
    finally { setSaving(false); }
  }

  const fields = [
    { key: "name", label: "Institute Name", type: "text", placeholder: "Divergent Classes" },
    { key: "contactEmail", label: "Contact Email", type: "email", placeholder: "hello@divergent.in" },
    { key: "contactPhone", label: "Contact Phone", type: "tel", placeholder: "+91 98765 43210" },
    { key: "address", label: "Address", type: "text", placeholder: "New Delhi, India" },
    { key: "gstNumber", label: "GST Number", type: "text", placeholder: "22AAAAA0000A1Z5" },
    { key: "logoUrl", label: "Logo URL", type: "url", placeholder: "https://cdn.example.com/logo.png" },
    { key: "primaryColor", label: "Brand Color (hex)", type: "text", placeholder: "#38c1ff" },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-8 px-6 py-12 lg:px-10">
        {/* Hero */}
        <RevealSection>
          <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-r from-[#7c3aed] via-[#6d28d9] to-[#4f46e5] px-8 py-10 text-white shadow-[0_24px_60px_rgba(109,40,217,0.28)]">
            <motion.div
              className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em]">
                Owner Controls
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Platform Settings</h1>
              <p className="mt-3 max-w-xl text-[15px] leading-7 text-white/85">
                Configure your institute&apos;s identity, branding, contact details, and legal information.
              </p>
              {settings && <p className="mt-3 text-[13px] text-white/60">Last updated {formatShortDate(settings.updatedAt)}</p>}
            </div>
          </section>
        </RevealSection>

        {/* Settings form */}
        <RevealSection>
          <section className="rounded-[28px] border border-white/70 bg-white/95 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">Institute Configuration</h2>
            <p className="mt-1 text-[13px] text-[#667085]">These settings apply across the entire platform.</p>

            {loading ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-14 animate-pulse rounded-[14px] bg-[#f3f4f6]" />)}
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
                      <label className="mb-1.5 block text-[13px] font-medium text-[#0f172a]">{f.label}</label>
                      <div className="flex items-center gap-3">
                        {f.key === "primaryColor" && (
                          <input
                            type="color"
                            value={form.primaryColor ?? "#38c1ff"}
                            onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                            className="h-12 w-14 cursor-pointer rounded-[12px] border border-[#e2e8f0] bg-white p-1"
                          />
                        )}
                        <input
                          type={f.type}
                          placeholder={f.placeholder}
                          value={(form as Record<string, string | null>)[f.key] ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                          className="h-12 flex-1 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] px-4 text-[14px] text-[#0f172a] outline-none transition focus:border-[#7c3aed] focus:bg-white focus:ring-2 focus:ring-[#7c3aed]/15"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {error && <p className="mt-4 text-[13px] text-[#dc2626]">{error}</p>}

                <div className="mt-8 flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-[14px] bg-[#7c3aed] px-8 py-3.5 text-[14px] font-semibold text-white transition hover:bg-[#6d28d9] disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Settings"}
                  </button>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[14px] font-medium text-[#15803d]"
                    >
                      ✓ Settings saved
                    </motion.span>
                  )}
                </div>
              </form>
            )}
          </section>
        </RevealSection>

        {/* Brand preview */}
        {form.primaryColor && (
          <RevealSection>
            <section className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <h2 className="text-[18px] font-semibold text-[#101828]">Brand Preview</h2>
              <div className="mt-5 flex items-center gap-5">
                <div
                  className="grid h-16 w-16 place-items-center rounded-[18px] text-2xl font-bold text-white shadow-[0_8px_24px_rgba(0,0,0,0.15)]"
                  style={{ backgroundColor: form.primaryColor ?? "#38c1ff" }}
                >
                  {(form.name ?? "D")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-[20px] font-bold" style={{ color: form.primaryColor ?? "#38c1ff" }}>
                    {form.name ?? "Institute Name"}
                  </p>
                  <p className="text-[13px] text-[#667085]">{form.contactEmail ?? "contact@example.com"}</p>
                </div>
              </div>
            </section>
          </RevealSection>
        )}
      </div>
    </PageTransition>
  );
}
