"use client";

import { useEffect, useState } from "react";
import { m as motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { formatShortDate } from "@/lib/date-format";
import { Building2, Check, Palette, Settings } from "lucide-react";
import {
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  adminButton,
  adminInputClass,
  adminLabelClass,
} from "../../_components/admin-ui";

type Settings = {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  gstNumber: string | null;
  requirePayment: boolean;
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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Owner controls"
            icon={Settings}
            title="Platform settings"
            description="Your institute's identity, branding, contact details and legal information."
            actions={
              settings ? (
                <span className="text-[13px] text-[#64748b]">Last updated {formatShortDate(settings.updatedAt)}</span>
              ) : null
            }
          />
        </RevealSection>

        {/* Settings form */}
        <RevealSection>
          <AdminPanel>
            <AdminPanelHeader icon={Building2} tone="violet" title="Institute configuration" description="These settings apply across the entire platform" />

            {loading ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-14 animate-pulse rounded-[12px] bg-[#f1f5f9]" />)}
              </div>
            ) : (
              <form onSubmit={handleSave} className="mt-8">
                <div className="grid gap-5 sm:grid-cols-2">
                  {fields.map((f) => (
                    <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
                      <label className={adminLabelClass}>{f.label}</label>
                      <div className="flex items-center gap-3">
                        {f.key === "primaryColor" && (
                          <input
                            type="color"
                            value={form.primaryColor ?? "#38c1ff"}
                            onChange={(e) => setForm((p) => ({ ...p, primaryColor: e.target.value }))}
                            className="h-11 w-14 shrink-0 cursor-pointer rounded-[12px] border border-[#e2e8f0] bg-white p-1"
                          />
                        )}
                        <input
                          type={f.type}
                          placeholder={f.placeholder}
                          value={(form as Record<string, string | null>)[f.key] ?? ""}
                          onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                          className={adminInputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] p-5">
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <h3 className="text-[14px] font-semibold text-[#0f172a]">Require payment for courses</h3>
                      <p className="mt-1 text-[13px] text-[#64748b]">If turned off, students can enroll in any course for free without passing through the Cashfree payment gateway.</p>
                    </div>
                    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                      <span className="sr-only">Require payment for courses</span>
                      <input 
                        type="checkbox" 
                        className="peer sr-only" 
                        checked={form.requirePayment ?? true} 
                        onChange={(e) => setForm(p => ({ ...p, requirePayment: e.target.checked }))} 
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#209bd2] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-[#38c1ff]/30"></div>
                    </label>
                  </div>
                </div>

                {error && <p className="mt-4 text-[13px] text-[#dc2626]">{error}</p>}

                <div className="mt-8 flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className={adminButton.primary}
                  >
                    {saving ? "Saving…" : "Save settings"}
                  </button>
                  {saved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[13px] font-medium text-[#15803d]"
                    >
                      <Check className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />Settings saved
                    </motion.span>
                  )}
                </div>
              </form>
            )}
          </AdminPanel>
        </RevealSection>

        {/* Brand preview */}
        {form.primaryColor && (
          <RevealSection>
            <AdminPanel>
              <AdminPanelHeader icon={Palette} tone="sky" title="Brand preview" description="How your name and colour appear to students" />
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
                  <p className="text-[13px] text-[#64748b]">{form.contactEmail ?? "contact@example.com"}</p>
                </div>
              </div>
            </AdminPanel>
          </RevealSection>
        )}
      </div>
    </PageTransition>
  );
}
