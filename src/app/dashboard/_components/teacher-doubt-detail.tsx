"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  PageTransition,
  RevealSection,
} from "./motion-wrappers";
import { TeacherSidebar } from "./teacher-sidebar";
import { TeacherTopBar } from "./teacher-top-bar";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type Reply = {
  id: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  author: { id: string; name: string | null; role: string } | null;
};

type DoubtDetail = {
  id: string;
  subject: string;
  body: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CLOSED";
  createdAt: string;
  student: { id: string; name: string | null; email: string | null };
  mentor: { id: string; name: string | null } | null;
  replies: Reply[];
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-[rgba(255,61,0,0.15)] text-[#b91c0c]",
  ASSIGNED: "bg-[rgba(21,93,252,0.15)] text-[#1d4ed8]",
  RESOLVED: "bg-[rgba(76,175,80,0.15)] text-[#15803d]",
  CLOSED: "bg-[rgba(100,100,100,0.15)] text-[#555555]",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-[#f0fdf4] text-[#15803d]",
  MEDIUM: "bg-[#fffbeb] text-[#b45309]",
  HIGH: "bg-[#fef2f2] text-[#b91c0c]",
};

// ─── SVG Icons ──────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-[#949494]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" />
    </svg>
  );
}

function ResolveIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 12.5 10.5 15.5 16.5 9.5" /><circle cx="12" cy="12" r="8.5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="m7.5 12.5 3 3 6-6" />
    </svg>
  );
}

function ActionChip({ icon, label, onClick, tone = "default", disabled = false }: { icon: React.ReactNode; label: string; onClick?: () => void; tone?: "default" | "green"; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      className={`inline-flex h-8 items-center gap-2 rounded-[10px] border px-3 text-[14px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
        tone === "green"
          ? "border-[#22c55e] bg-[#f0fdf4] text-[#15803d] hover:bg-[#22c55e] hover:text-white"
          : "border-[#d9d9d9] text-black hover:bg-[#f5f5f5]"
      }`}
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.18 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon}
      {label}
    </motion.button>
  );
}

export function TeacherDoubtDetail() {
  const searchParams = useSearchParams();
  const doubtId = searchParams.get("id");

  const [doubt, setDoubt] = useState<DoubtDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [sending, setSending] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDoubt = useCallback(() => {
    if (!doubtId) { setLoading(false); setNotFound(true); return; }
    fetch(`/api/doubts/${doubtId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setDoubt(json.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [doubtId]);

  useEffect(() => { 
    fetchDoubt(); 
    const interval = setInterval(fetchDoubt, 5000);
    return () => clearInterval(interval);
  }, [fetchDoubt]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setSendError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setAttachmentUrl(json.data.url);
      } else {
        setSendError(json.message || "Failed to upload image");
      }
    } catch (err) {
      console.error(err);
      setSendError("An unexpected error occurred during image upload");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !doubtId || sending) return;
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(`/api/doubts/${doubtId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, attachmentUrl: attachmentUrl || undefined }),
      });
      const json = await res.json();
      if (json.success || res.status === 201) {
        setReply("");
        setAttachmentUrl("");
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 2500);
        fetchDoubt(); // reload to show new reply
      } else {
        setSendError(json.message || "Failed to send reply");
      }
    } catch (err) { 
      console.error(err); 
      setSendError("An unexpected error occurred");
    } finally { 
      setSending(false); 
    }
  };

  const handleResolve = async () => {
    if (!doubtId || resolving || doubt?.status === "RESOLVED") return;
    setResolving(true);
    try {
      const res = await fetch(`/api/doubts/${doubtId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      const json = await res.json();
      if (json.success) fetchDoubt();
    } catch (err) { console.error(err); }
    finally { setResolving(false); }
  };

  const studentInitials = doubt?.student.name
    ? doubt.student.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <PageTransition>
        <TeacherTopBar />

        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-0 lg:pt-8">
          <TeacherSidebar />

          <main className="space-y-8 lg:pr-[160px]">

            {/* Loading */}
            {loading && (
              <div className="flex items-center gap-3 py-32 justify-center text-[#8b8888]">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} className="h-7 w-7 rounded-full border-2 border-[#38c1ff] border-t-transparent" />
                Loading doubt...
              </div>
            )}

            {/* Not found */}
            {!loading && notFound && (
              <div className="rounded-[20px] border border-dashed border-[#d9d9d9] bg-white py-20 text-center">
                <p className="text-[40px]">🔍</p>
                <p className="mt-3 text-[16px] font-medium text-[#374151]">Doubt not found</p>
                <p className="mt-1 text-[14px] text-[#9ca3af]">No ID was provided or this doubt doesn&apos;t exist</p>
                <Link href="/dashboard/teacher/doubt-list" className="mt-5 inline-block text-[14px] font-medium text-[#38c1ff] hover:underline">
                  ← Back to doubt list
                </Link>
              </div>
            )}

            {/* Main content */}
            {!loading && doubt && (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">

                  {/* Student info header */}
                  <RevealSection>
                    <section className="rounded-[20px] border border-[#d9d9d9] bg-white px-6 py-7 shadow-[0px_4px_10px_rgba(0,0,0,0.18)] sm:px-8">
                      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-6">
                          <motion.div
                            className="grid h-[70px] w-[70px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#38c1ff] to-[#0077ff] text-[24px] font-bold text-white"
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ duration: 3.2, repeat: Infinity }}
                          >
                            {studentInitials}
                          </motion.div>

                          <div>
                            <div className="space-y-1">
                              <p className="text-[24px] font-semibold leading-none text-black">
                                {doubt.student.name ?? "Unknown Student"}
                              </p>
                              <p className="text-[15px] text-[#6b7280]">{doubt.student.email ?? "—"}</p>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <span className={`rounded-[10px] px-4 py-1 text-[12px] font-medium ${priorityColors[doubt.priority]}`}>
                                {doubt.priority.charAt(0) + doubt.priority.slice(1).toLowerCase()} Priority
                              </span>
                              <span className="inline-flex items-center gap-2 text-[12px] text-[#949494]">
                                <ClockIcon />
                                {timeAgo(doubt.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className={`inline-flex h-6 items-center rounded-[10px] px-5 text-[12px] font-medium ${statusColors[doubt.status]}`}>
                          {doubt.status.charAt(0) + doubt.status.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </section>
                  </RevealSection>

                  {/* Doubt body */}
                  <RevealSection delay={0.06}>
                    <section className="rounded-[20px] border border-[#d9d9d9] bg-white px-6 py-8 shadow-[0px_4px_10px_rgba(0,0,0,0.18)] sm:px-9">
                      <h1 className="max-w-[620px] text-[clamp(1.6rem,3.5vw,2.2rem)] font-bold leading-tight tracking-[-0.03em] text-black">
                        {doubt.subject}
                      </h1>

                      <p className="mt-6 max-w-[680px] text-[17px] leading-relaxed text-[#4b5563]">
                        {doubt.body}
                      </p>
                    </section>
                  </RevealSection>

                  {/* Conversation thread */}
                  <RevealSection delay={0.08}>
                    <section className="rounded-[20px] border border-[#d9d9d9] bg-white px-6 py-8 shadow-[0px_4px_10px_rgba(0,0,0,0.18)] sm:px-7">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-black">Conversation</h2>
                        <p className="text-[15px] text-[#6b7280]">
                          {doubt.replies.length} {doubt.replies.length === 1 ? "reply" : "replies"}
                        </p>
                      </div>

                      {doubt.replies.length === 0 ? (
                        <p className="mt-6 text-[15px] text-[#9ca3af]">No replies yet. Be the first to respond!</p>
                      ) : (
                        <div className="mt-6 space-y-5">
                          {doubt.replies.map((r, i) => {
                            const isMentor = r.author?.role === "MENTOR" || r.author?.role === "ADMIN" || r.author?.role === "SUPER_ADMIN";
                            const initials = r.author?.name
                              ? r.author.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                              : "?";
                            return (
                              <motion.div
                                key={r.id}
                                className="flex items-start gap-5"
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, ease, delay: i * 0.05 }}
                              >
                                <div className={`grid h-[50px] w-[50px] shrink-0 place-items-center rounded-full text-[14px] font-bold text-white ${isMentor ? "bg-gradient-to-br from-[#925fe2] to-[#6f3fcf]" : "bg-gradient-to-br from-[#38c1ff] to-[#0077ff]"}`}>
                                  {initials}
                                </div>

                                <div className="min-w-0 max-w-[560px]">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <p className="text-[18px] font-semibold text-black">{r.author?.name ?? "Unknown"}</p>
                                    {isMentor && (
                                      <span className="rounded-full bg-[#925fe2] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                        Mentor
                                      </span>
                                    )}
                                    <p className="text-[13px] text-[#949494]">{timeAgo(r.createdAt)}</p>
                                  </div>

                                  <motion.div
                                    className={`mt-3 rounded-[18px] px-5 py-5 ${isMentor ? "bg-[#eff6ff]" : "bg-[#f1f1f1]"}`}
                                    whileHover={{ y: -2 }}
                                    transition={{ duration: 0.18 }}
                                  >
                                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-black">{r.body}</p>
                                    {r.attachmentUrl && (
                                      <div className="mt-4 overflow-hidden rounded-[12px] border border-black/5 shadow-sm">
                                        <img src={r.attachmentUrl} alt="Reply Attachment" className="max-h-[300px] w-auto object-contain" />
                                      </div>
                                    )}
                                  </motion.div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </RevealSection>

                  {/* Reply composer */}
                  <RevealSection delay={0.12}>
                    <section className="rounded-[20px] border border-[#d9d9d9] bg-white px-6 py-6 shadow-[0px_4px_10px_rgba(0,0,0,0.18)] sm:px-8">
                      <p className="text-[16px] font-medium text-black">
                        Help the student understand, not just answer ✨
                      </p>

                      <motion.div
                        className="mt-4 rounded-[20px] bg-[#f1f1f1] px-6 py-5"
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.18 }}
                      >
                        <textarea
                          className="min-h-[132px] w-full resize-none bg-transparent text-[16px] text-black outline-none placeholder:text-[#828282]"
                          placeholder="Type your answer....."
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          disabled={doubt.status === "RESOLVED" || doubt.status === "CLOSED"}
                        />

                        {attachmentUrl && (
                          <div className="mt-4 relative inline-block">
                            <img src={attachmentUrl} alt="Attached Preview" className="max-h-[150px] rounded-[10px] border border-black/10 object-contain" />
                            <button
                              type="button"
                              onClick={() => setAttachmentUrl("")}
                              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                          </div>
                        )}
                      </motion.div>

                      {sendSuccess && (
                        <motion.p
                          className="mt-3 flex items-center gap-2 text-[14px] font-medium text-[#15803d]"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <CheckCircleIcon /> Reply sent successfully!
                        </motion.p>
                      )}

                      {sendError && (
                        <motion.p
                          className="mt-3 flex items-center gap-2 text-[14px] font-medium text-red-600"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          ❌ {sendError}
                        </motion.p>
                      )}

                      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp, image/gif" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
                          />
                          <ActionChip 
                            icon={<UploadIcon />} 
                            label={uploadingImage ? "Uploading..." : "Attach"} 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={uploadingImage || doubt.status === "RESOLVED" || doubt.status === "CLOSED"}
                          />
                          <ActionChip
                            icon={<ResolveIcon />}
                            label={resolving ? "Resolving…" : doubt.status === "RESOLVED" ? "Already Resolved" : "Mark as resolved"}
                            tone="green"
                            onClick={handleResolve}
                          />
                        </div>

                        <motion.button
                          type="button"
                          className="inline-flex h-8 items-center gap-2 rounded-[10px] bg-[#38c1ff] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.18 }}
                          onClick={handleSendReply}
                          disabled={sending || !reply.trim() || doubt.status === "RESOLVED" || doubt.status === "CLOSED"}
                        >
                          <SendIcon />
                          {sending ? "Sending…" : "Send reply"}
                        </motion.button>
                      </div>
                    </section>
                  </RevealSection>

                  <div className="pb-4">
                    <Link
                      href="/dashboard/teacher/doubt-list"
                      className="inline-flex items-center text-[14px] font-medium text-[#209bd2] transition hover:text-[#187aa8]"
                    >
                      ← Back to doubt list
                    </Link>
                  </div>
                </div>

                {/* Student sidebar */}
                <RevealSection delay={0.1}>
                  <aside className="rounded-[20px] border border-[#ddd] bg-white px-5 py-5 shadow-[0px_4px_10px_rgba(0,0,0,0.14)]">
                    <p className="text-[20px] font-medium text-black">Student Overview</p>

                    <motion.div
                      className="mx-auto mt-8 grid h-[100px] w-[100px] place-items-center rounded-full bg-gradient-to-br from-[#38c1ff] to-[#0077ff] text-[32px] font-bold text-white"
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 3.2, repeat: Infinity }}
                    >
                      {studentInitials}
                    </motion.div>

                    <p className="mt-4 text-center text-[20px] font-semibold text-black">
                      {doubt.student.name ?? "Unknown"}
                    </p>
                    <p className="mt-1 text-center text-[13px] text-[#6b7280]">{doubt.student.email}</p>

                    <div className="mt-6 space-y-3">
                      <div className="rounded-[10px] bg-[rgba(56,193,255,0.2)] px-4 py-3">
                        <p className="text-[12px] text-black/70">Total Doubts</p>
                        <p className="mt-1 text-[18px] font-semibold text-black">—</p>
                      </div>
                      <div className={`rounded-[10px] px-4 py-3 ${statusColors[doubt.status]}`}>
                        <p className="text-[12px] text-black/70">This Doubt Status</p>
                        <p className="mt-1 text-[16px] font-semibold">
                          {doubt.status.charAt(0) + doubt.status.slice(1).toLowerCase()}
                        </p>
                      </div>
                      {doubt.mentor && (
                        <div className="rounded-[10px] bg-[rgba(146,95,226,0.15)] px-4 py-3">
                          <p className="text-[12px] text-black/70">Assigned Mentor</p>
                          <p className="mt-1 text-[15px] font-semibold text-black">{doubt.mentor.name}</p>
                        </div>
                      )}
                    </div>
                  </aside>
                </RevealSection>
              </div>
            )}
          </main>
        </div>
      </PageTransition>
    </div>
  );
}
