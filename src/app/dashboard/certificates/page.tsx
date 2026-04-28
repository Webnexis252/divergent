"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { PageTransition, RevealSection } from "@/app/dashboard/_components/motion-wrappers";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import Image from "next/image";

type Certificate = {
  id: string;
  issuedAt: string;
  course: { id: string; title: string; thumbnail: string | null };
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/certificates")
      .then((r) => r.json())
      .then((json) => { if (json.success) setCerts(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="text-black">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <DashboardSidebar />
          <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1100px] space-y-8">

              {/* Hero */}
              <RevealSection>
                <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] px-8 py-10 text-white shadow-[0_20px_50px_rgba(251,191,36,0.3)]">
                  <motion.div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" animate={{ rotate: [0, 360] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
                  <div className="relative z-10">
                    <div className="inline-flex rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest">🏆 Achievements</div>
                    <h1 className="mt-4 text-[32px] font-semibold tracking-tight">My Certificates</h1>
                    <p className="mt-2 text-white/85 text-[15px]">
                      You&apos;ve earned {certs.length} certificate{certs.length !== 1 ? "s" : ""}. Keep going!
                    </p>
                  </div>
                </div>
              </RevealSection>

              {/* Certificates Grid */}
              {loading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[1,2,3].map(i => <div key={i} className="h-48 animate-pulse rounded-[20px] bg-gray-100" />)}
                </div>
              ) : certs.length === 0 ? (
                <div className="rounded-[24px] bg-white p-14 text-center shadow-sm">
                  <p className="text-[60px]">🎓</p>
                  <p className="mt-4 text-[20px] font-semibold text-[#101828]">No certificates yet</p>
                  <p className="mt-2 text-[14px] text-[#667085]">Complete a course at 100% to earn your first certificate.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {certs.map((cert, i) => (
                    <motion.div
                      key={cert.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.4 }}
                      whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(251,191,36,0.15)" }}
                      className="relative overflow-hidden rounded-[20px] bg-white shadow-[0px_4px_16px_rgba(0,0,0,0.08)]"
                    >
                      {/* Decorative border */}
                      <div className="h-2 w-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]" />

                      <div className="p-6">
                        {cert.course.thumbnail ? (
                          <Image src={cert.course.thumbnail} alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-2xl">🎓</div>
                        )}

                        <h3 className="mt-4 text-[16px] font-bold text-[#101828] leading-tight">{cert.course.title}</h3>
                        <p className="mt-1 text-[12px] text-[#94a3b8]">Issued on {formatDate(cert.issuedAt)}</p>

                        {/* Decorative cert watermark */}
                        <div className="mt-5 flex items-center justify-between rounded-[12px] border border-amber-100 bg-amber-50 px-4 py-3">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Certificate of Completion</p>
                            <p className="mt-0.5 text-[11px] text-amber-700">Divergent Classes</p>
                          </div>
                          <span className="text-2xl">🏅</span>
                        </div>

                        <button
                          onClick={() => {
                            // Print certificate using window.print
                            const printContent = `
                              <html><head><title>Certificate</title>
                              <style>body{font-family:Georgia,serif;text-align:center;padding:60px;background:#fffdf0;}
                              h1{color:#b45309;font-size:42px;} h2{color:#1f2937;font-size:28px;} p{color:#6b7280;font-size:18px;margin:8px 0;}
                              .border{border:8px double #fbbf24;padding:40px;max-width:700px;margin:auto;}</style></head>
                              <body><div class="border">
                              <p style="font-size:14px;text-transform:uppercase;letter-spacing:3px;color:#b45309">Divergent Classes</p>
                              <h1>🏆 Certificate of Completion</h1>
                              <p>This certifies that you have successfully completed</p>
                              <h2>${cert.course.title}</h2>
                              <p style="margin-top:24px">Issued on ${formatDate(cert.issuedAt)}</p>
                              </div></body></html>`;
                            const win = window.open('', '_blank');
                            win?.document.write(printContent);
                            win?.document.close();
                            win?.print();
                          }}
                          className="mt-4 w-full rounded-[12px] bg-gradient-to-r from-[#fbbf24] to-[#f59e0b] py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:opacity-90"
                        >
                          Download Certificate
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </PageTransition>
    </div>
  );
}
