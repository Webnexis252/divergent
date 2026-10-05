"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, Clock3, ImagePlus, MessageCircle, Plus, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { DOUBT_IMAGE_XP_COST, DOUBT_SUBMISSION_XP_COST } from "@/lib/xp-costs";
import { EmptyState } from "@/components/ui/empty-state";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { PageHero } from "@/components/ui/page-hero";
import { usePolling } from "@/hooks/use-polling";
import { AnimCard, PageTransition, RevealSection, StaggerGrid } from "../_components/motion-wrappers";

type DoubtReply = {
  id: string;
  body: string;
  createdAt: string;
  isAiGenerated?: boolean;
  author: { id: string; name: string | null; role: string } | null;
};

type Doubt = {
  id: string;
  subject: string;
  body: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "OPEN" | "ASSIGNED" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  mentor: { id: string; name: string | null } | null;
  replies?: DoubtReply[]; // not included by the list API; fetched when a doubt is opened
  _count: { replies: number };
  attachmentUrl?: string | null;
};

type Filter = "all" | "waiting" | "answered";

const art = {
  waiting: "/assets/dashboard/quick-exam.png",
  answered: "/assets/dashboard/explore-library.png",
} as const;

// Brand blue darkened just enough to pass AA as small text on white
const brandInk = "text-[color-mix(in_srgb,var(--brand-primary-strong)_72%,black)]";
// globals.css sets `button { font: inherit }` outside any layer, so on <button>s the type utilities go on an inner span
const primaryAction =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] bg-(--brand-primary-strong) px-5 text-white shadow-[0_4px_12px_rgba(32,155,210,0.28)] transition-[transform,filter,background-color] duration-150 hover:-translate-y-0.5 hover:brightness-95 active:translate-y-0 disabled:pointer-events-none disabled:bg-black/[0.12] disabled:text-black/40 disabled:shadow-none";
const secondaryAction = cx(
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[rgba(56,193,255,0.45)] bg-white px-5 transition-colors duration-150 hover:bg-(--brand-primary-soft)",
  brandInk,
);
const card = "rounded-[20px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]";
const sectionTitle = "text-[clamp(1.5rem,2.6vw,1.85rem)] font-semibold tracking-[-0.02em] text-black";
const sectionLede = "mt-1 text-[14px] text-black/55";
const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold";
const input =
  "w-full rounded-[14px] bg-[#f4f6f9] px-4 text-[14px] text-black outline-none ring-1 ring-black/[0.04] transition placeholder:text-black/40 focus:bg-white focus:ring-[rgba(56,193,255,0.55)]";

const STAFF_ROLES = new Set(["MENTOR", "TEACHER", "ADMIN", "SUPER_ADMIN"]);
const isWaiting = (doubt: Doubt) => doubt.status === "OPEN" || doubt.status === "ASSIGNED";

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Normal" },
  { value: "HIGH", label: "Urgent" },
] as const;

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  const days = Math.floor(diff / 86400);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function StatusPill({ doubt }: { doubt: Doubt }) {
  switch (doubt.status) {
    case "OPEN":
      return <span className={cx(pill, "bg-[rgba(254,198,0,0.2)] text-[#6b4c00]")}>Waiting for a teacher</span>;
    case "ASSIGNED":
      return (
        <span className={cx(pill, "bg-(--brand-primary-soft)", brandInk)}>
          {doubt.mentor?.name ? `With ${doubt.mentor.name}` : "Teacher assigned"}
        </span>
      );
    case "RESOLVED":
      return <span className={cx(pill, "bg-[rgba(76,175,80,0.14)] text-[#2e6b31]")}>Answered</span>;
    default:
      return <span className={cx(pill, "bg-black/[0.05] text-black/60")}>Closed</span>;
  }
}

function StatCard({ image, label, value, note }: { image: string; label: string; value: string; note: string }) {
  return (
    <AnimCard className="min-w-[220px] flex-1 snap-start sm:min-w-0">
      <div className="flex items-center gap-4 rounded-[24px] bg-white p-3 pr-5 shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
        <div className="grid h-[76px] w-[76px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#f4f2ff]">
          <Image alt="" className="h-[76px] w-[76px] scale-[1.35] object-contain" height={152} src={image} width={152} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-black/55">{label}</p>
          <p className="mt-1 text-[2rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-black">{value}</p>
          <p className="mt-1 truncate text-[12px] text-black/45">{note}</p>
        </div>
      </div>
    </AnimCard>
  );
}

function FilterChip({ active, count, label, onClick }: { active: boolean; count: number; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 transition-colors",
        active ? "bg-(--brand-primary-strong) text-white" : "bg-white text-black/70 ring-1 ring-black/[0.06] hover:bg-black/[0.03]",
      )}
    >
      <span className="text-[13px] font-semibold">{label}</span>
      <span className={cx("text-[12px] font-semibold tabular-nums", active ? "text-white/80" : "text-black/40")}>{count}</span>
    </button>
  );
}

// ─── Thread ───────────────────────────────────────────────────────────────────

function ReplyThread({ replies }: { replies?: DoubtReply[] }) {
  if (!replies) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading replies</span>
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
            <div className="h-14 flex-1 animate-pulse rounded-[16px] bg-black/[0.04]" />
          </div>
        ))}
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <p className="rounded-[16px] bg-[#f6f9fc] px-4 py-5 text-center text-[13px] text-black/55">
        No replies yet. A teacher&apos;s answer will show up here.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {replies.map((reply) => {
        const isStaff = Boolean(reply.author && STAFF_ROLES.has(reply.author.role));
        const isAi = reply.isAiGenerated || !reply.author;
        const name = isAi ? "AI assistant" : (reply.author?.name ?? "Unknown");
        return (
          <li key={reply.id} className="flex items-start gap-3">
            <InitialsAvatar name={name} className="mt-0.5 h-8 w-8 text-[11px]" />
            <div
              className={cx(
                "min-w-0 flex-1 rounded-[16px] rounded-tl-[6px] px-4 py-3",
                isStaff ? "bg-[#eef8ff] ring-1 ring-[rgba(56,193,255,0.25)]" : "bg-[#f6f9fc]",
              )}
            >
              <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[13px] font-semibold text-black">{name}</span>
                {isStaff && (
                  <span className="rounded-full bg-[rgba(254,198,0,0.22)] px-2 py-0.5 text-[11px] font-semibold text-[#6b4c00]">
                    {reply.author?.role === "MENTOR" || reply.author?.role === "TEACHER" ? "Teacher" : "Admin"}
                  </span>
                )}
                <span className="text-[11px] text-black/45">{timeAgo(reply.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-black/75">{reply.body}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function DoubtCard({ doubt, isExpanded, onToggle }: { doubt: Doubt; isExpanded: boolean; onToggle: () => void }) {
  const threadId = `doubt-thread-${doubt.id}`;
  return (
    <article className={cx(card, "overflow-hidden")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={threadId}
        className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f8fcff] sm:px-6 sm:py-5"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill doubt={doubt} />
            {doubt.priority === "HIGH" && (
              <span className={cx(pill, "bg-[rgba(255,61,0,0.1)] text-[#b42d00]")}>Urgent</span>
            )}
            <span className="inline-flex items-center gap-1 text-[12px] text-black/45">
              <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
              Asked {timeAgo(doubt.createdAt)}
            </span>
          </span>
          <span className="mt-2 block text-[16px] font-semibold leading-snug text-black">{doubt.subject}</span>
          <span className={cx("mt-1 block whitespace-pre-wrap break-words text-[14px] leading-relaxed text-black/60", !isExpanded && "line-clamp-2")}>
            {doubt.body}
          </span>
          <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-black/50">
            <span className="inline-flex items-center gap-1">
              <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
              {doubt._count.replies} {doubt._count.replies === 1 ? "reply" : "replies"}
            </span>
            {doubt.attachmentUrl && <span>· Photo attached</span>}
            <span>· Updated {timeAgo(doubt.updatedAt)}</span>
          </span>
        </span>
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/[0.04]">
          <ChevronDown
            aria-hidden="true"
            className={cx("h-4 w-4 text-black/50 transition-transform duration-200", isExpanded && "rotate-180")}
          />
        </span>
      </button>

      {isExpanded && (
        <div id={threadId} className="space-y-4 border-t border-black/[0.05] bg-[#fcfdff] px-5 py-5 sm:px-6">
          {doubt.attachmentUrl && (
            <a
              href={doubt.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-fit overflow-hidden rounded-[14px] ring-1 ring-black/[0.06] transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded images live on external storage */}
              <img src={doubt.attachmentUrl} alt="Photo attached to this doubt" className="max-h-56 w-auto object-cover" />
            </a>
          )}
          <ReplyThread replies={doubt.replies} />
        </div>
      )}
    </article>
  );
}

function ListSkeleton() {
  return (
    <div role="status" className="space-y-3">
      <span className="sr-only">Loading your doubts</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className={cx(card, "space-y-3 px-6 py-5")}>
          <div className="h-6 w-40 animate-pulse rounded-full bg-black/[0.05]" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-black/[0.07]" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-black/[0.04]" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DoubtsPage() {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const lastListRef = useRef("");

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  function handleImageRemove() {
    setImageFile(null);
    setImagePreview(null);
  }

  function openComposer() {
    setShowComposer(true);
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      subjectRef.current?.focus({ preventScroll: true });
    });
  }

  // Resolves to whether anything changed, so polling eases off when it hasn't
  const fetchDoubts = useCallback(async (): Promise<boolean> => {
    try {
      const text = await fetch("/api/doubts").then((r) => r.text());
      const changed = text !== lastListRef.current;
      lastListRef.current = text;
      const json = JSON.parse(text);
      if (!json.success) {
        setLoadFailed(true);
        return false;
      }
      setLoadFailed(false);
      if (changed) {
        setDoubts((prev) =>
          json.data.map((next: Doubt) => {
            const old = prev.find((d) => d.id === next.id);
            return old?.replies ? { ...next, replies: old.replies } : next;
          }),
        );
      }
      return changed;
    } catch (error) {
      console.error("Failed to fetch doubts", error);
      setLoadFailed(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // The list every 15s, easing off to a minute while nothing changes; paused in a hidden tab
  usePolling(fetchDoubts, { intervalMs: 15_000, maxIntervalMs: 60_000 });

  const lastThreadRef = useRef("");
  const fetchThread = useCallback(async (): Promise<boolean> => {
    if (!expandedId) return false;
    const id = expandedId;
    try {
      const text = await fetch(`/api/doubts/${id}`).then((res) => res.text());
      const changed = text !== lastThreadRef.current;
      lastThreadRef.current = text;
      const json = JSON.parse(text);
      if (!json.success || !changed) return false;
      setDoubts((current) => current.map((item) => (item.id === id ? { ...item, replies: json.data.replies } : item)));
      return true;
    } catch (error) {
      console.error("Failed to fetch doubt detail", error);
      return false;
    }
  }, [expandedId]);

  // The open thread every 5s while replies arrive, easing off to 30s
  usePolling(fetchThread, { intervalMs: 5000, maxIntervalMs: 30_000, enabled: Boolean(expandedId), resetKey: expandedId });

  const stats = useMemo(() => {
    const waiting = doubts.filter(isWaiting).length;
    return { waiting, answered: doubts.length - waiting };
  }, [doubts]);

  const visible = useMemo(
    () =>
      doubts.filter((doubt) =>
        filter === "all" ? true : filter === "waiting" ? isWaiting(doubt) : !isWaiting(doubt),
      ),
    [doubts, filter],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      let attachmentUrl = null;
      if (imageFile) {
        try {
          const formData = new FormData();
          formData.append("file", imageFile);
          const uploadJson = await fetch("/api/upload/image", { method: "POST", body: formData }).then((r) => r.json());
          if (uploadJson.success) attachmentUrl = uploadJson.data.url;
          else setErrorMsg("The photo could not be uploaded, so the doubt was sent without it.");
        } catch {
          // Upload failed: send the doubt without the photo rather than not at all
          setErrorMsg("The photo could not be uploaded, so the doubt was sent without it.");
        }
      }

      const response = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, priority, subject, attachmentUrl }),
      });
      const json = await response.json();

      if (json.success || response.status === 201) {
        setSubject("");
        setBody("");
        setPriority("MEDIUM");
        handleImageRemove();
        setShowComposer(false);
        setFilter("all");
        void fetchDoubts();
        return;
      }
      setErrorMsg(json.error || json.message || "Could not send your doubt right now.");
    } catch (error) {
      console.error("Failed to submit doubt", error);
      setErrorMsg("Could not send your doubt right now. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(doubt: Doubt) {
    if (expandedId === doubt.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(doubt.id);
    // The open-thread poll loads the replies straight away
  }

  const heroSummary = loading
    ? "Getting your doubts ready."
    : doubts.length === 0
      ? "Stuck on a lesson, an assignment or a test question? Ask a teacher and the answer lands here."
      : stats.waiting > 0
        ? `${plural(stats.waiting, "doubt")} waiting for a teacher, ${stats.answered} answered.`
        : `All ${plural(stats.answered, "doubt")} answered. Ask another whenever you're stuck.`;

  const cost = `${DOUBT_SUBMISSION_XP_COST} XP${imageFile ? ` + ${DOUBT_IMAGE_XP_COST} XP for the photo` : ""}`;

  return (
    <PageTransition>
      {/* overflow-x-clip, not hidden: hidden makes <main> a scroll container and breaks the sticky rail */}
      <main className="min-h-screen overflow-x-clip bg-[#f9fafb] pb-24 text-black sm:bg-[#f7f5f4] sm:pb-0">
        <section className="mx-auto min-w-0 max-w-[1920px] space-y-6 px-4 py-5 sm:space-y-8 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px] xl:pr-10">
          <RevealSection>
            <PageHero
              eyebrow="Doubts"
              title="Ask a Teacher"
              description={<p>{heroSummary}</p>}
              aside={
                <div className="rounded-[20px] bg-white p-5 text-black shadow-[0_12px_30px_rgba(8,80,130,0.18)] sm:p-6">
                  <p className="text-[16px] font-bold">Stuck on something?</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-black/60">
                    Describe the problem, add a photo of your work if it helps, and a teacher will reply in your thread.
                  </p>
                  <button type="button" onClick={openComposer} className={cx(primaryAction, "mt-4 w-full")}>
                    <Plus aria-hidden="true" className="h-4 w-4" />
                    <span className="text-[14px] font-semibold">Ask a doubt</span>
                  </button>
                  <p className="mt-2.5 text-center text-[12px] text-black/45">
                    Costs {DOUBT_SUBMISSION_XP_COST} XP, plus {DOUBT_IMAGE_XP_COST} XP with a photo
                  </p>
                </div>
              }
            />
          </RevealSection>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_293px] xl:items-start">
            <div className="min-w-0 space-y-6">
              {showComposer && (
                <div ref={composerRef} className="scroll-mt-[calc(var(--app-header-height)+1rem)]">
                  <form onSubmit={handleSubmit} className={cx(card, "space-y-5 px-5 py-6 sm:px-7")}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className={sectionTitle}>Ask a doubt</h2>
                        <p className={sectionLede}>
                          Say what you&apos;re stuck on, where it&apos;s from, and what you already tried.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowComposer(false)}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black"
                        aria-label="Close"
                      >
                        <X aria-hidden="true" className="h-5 w-5" />
                      </button>
                    </div>

                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-semibold text-black/70">Subject</span>
                      <input
                        ref={subjectRef}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Why is the moment of inertia of a ring MR²?"
                        className={cx(input, "h-11")}
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-semibold text-black/70">Details</span>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={5}
                        placeholder="Which lesson, assignment or question is it from? Where exactly do you get stuck?"
                        className={cx(input, "resize-y py-3 leading-relaxed")}
                      />
                    </label>

                    <div className="flex flex-wrap items-start gap-6">
                      <div>
                        <p className="mb-1.5 text-[13px] font-semibold text-black/70">Photo (optional)</p>
                        {imagePreview ? (
                          <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
                            <img src={imagePreview} alt="Selected photo" className="h-24 w-auto rounded-[12px] object-cover ring-1 ring-black/10" />
                            <button
                              type="button"
                              onClick={handleImageRemove}
                              className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-white shadow-sm transition-colors hover:bg-black"
                              aria-label="Remove photo"
                            >
                              <X aria-hidden="true" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border border-dashed border-[rgba(56,193,255,0.55)] bg-[#f8fcff] px-4 text-[13px] font-semibold text-black/65 transition-colors hover:bg-(--brand-primary-soft) hover:text-black">
                            <ImagePlus aria-hidden="true" className="h-4 w-4" />
                            Add a photo
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp, image/gif"
                              className="sr-only"
                              onChange={handleImageSelect}
                            />
                          </label>
                        )}
                        <p className="mt-1.5 text-[12px] text-black/45">JPEG, PNG, WEBP or GIF, up to 10 MB</p>
                      </div>

                      <fieldset>
                        <legend className="mb-1.5 text-[13px] font-semibold text-black/70">How urgent is it?</legend>
                        <div className="inline-flex rounded-[12px] bg-[#f4f6f9] p-1 ring-1 ring-black/[0.04]">
                          {priorityOptions.map((option) => {
                            const active = priority === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setPriority(option.value)}
                                aria-pressed={active}
                                className={cx(
                                  "h-9 rounded-[9px] px-4 transition-colors",
                                  active
                                    ? option.value === "HIGH"
                                      ? "bg-white text-[#b42d00] shadow-[0_1px_4px_rgba(15,23,42,0.1)]"
                                      : cx("bg-white shadow-[0_1px_4px_rgba(15,23,42,0.1)]", brandInk)
                                    : "text-black/55 hover:text-black",
                                )}
                              >
                                <span className="text-[13px] font-semibold">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    </div>

                    {errorMsg && (
                      <p role="alert" className="rounded-[12px] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[13px] font-medium text-[#b42d00]">
                        {errorMsg}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 border-t border-black/[0.05] pt-5">
                      <button type="submit" disabled={submitting || !subject.trim() || !body.trim()} className={primaryAction}>
                        {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />}
                        <span className="text-[14px] font-semibold">{submitting ? "Sending…" : "Send doubt"}</span>
                      </button>
                      <button type="button" onClick={() => setShowComposer(false)} className={secondaryAction}>
                        <span className="text-[14px] font-semibold">Cancel</span>
                      </button>
                      <span className="text-[12px] text-black/45">Uses {cost}</span>
                    </div>
                  </form>
                </div>
              )}

              <RevealSection delay={0.06}>
                <section aria-labelledby="doubts-heading" className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                    <div>
                      <h2 id="doubts-heading" className={sectionTitle}>
                        Your Doubts
                      </h2>
                      <p className={sectionLede}>Open one to see the teacher&apos;s reply.</p>
                    </div>
                    {doubts.length > 0 && (
                      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                        <FilterChip active={filter === "all"} count={doubts.length} label="All" onClick={() => setFilter("all")} />
                        <FilterChip active={filter === "waiting"} count={stats.waiting} label="Waiting" onClick={() => setFilter("waiting")} />
                        <FilterChip active={filter === "answered"} count={stats.answered} label="Answered" onClick={() => setFilter("answered")} />
                      </div>
                    )}
                  </div>

                  {loading ? (
                    <ListSkeleton />
                  ) : loadFailed && doubts.length === 0 ? (
                    <EmptyState
                      title="Couldn't load your doubts"
                      description="Check your connection and try again."
                      action={
                        <button type="button" onClick={() => void fetchDoubts()} className={primaryAction}>
                          <span className="text-[14px] font-semibold">Try again</span>
                        </button>
                      }
                    />
                  ) : doubts.length === 0 ? (
                    <div className={cx(card, "flex flex-col items-center px-6 py-12 text-center")}>
                      <Image alt="" className="h-28 w-28 scale-[1.3] object-contain" height={224} src={art.waiting} width={224} />
                      <p className="mt-4 text-[18px] font-bold text-black">No doubts yet</p>
                      <p className="mt-1.5 max-w-[44ch] text-[14px] leading-relaxed text-black/55">
                        When you ask one, it shows up here with its status and the teacher&apos;s reply.
                      </p>
                      <button type="button" onClick={openComposer} className={cx(primaryAction, "mt-5")}>
                        <Plus aria-hidden="true" className="h-4 w-4" />
                        <span className="text-[14px] font-semibold">Ask your first doubt</span>
                      </button>
                    </div>
                  ) : visible.length === 0 ? (
                    <p className={cx(card, "px-6 py-8 text-center text-[14px] text-black/55")}>
                      {filter === "waiting" ? "Nothing waiting. Every doubt has an answer." : "No answered doubts yet."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {visible.map((doubt) => (
                        <DoubtCard
                          key={doubt.id}
                          doubt={doubt}
                          isExpanded={expandedId === doubt.id}
                          onToggle={() => void handleToggle(doubt)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </RevealSection>
            </div>

            <aside
              aria-labelledby="doubt-summary-heading"
              className="order-first min-w-0 space-y-4 xl:sticky xl:top-[calc(var(--app-header-height)+1.5rem)] xl:order-none"
            >
              <div className="sr-only xl:not-sr-only">
                <h2 id="doubt-summary-heading" className={sectionTitle}>
                  At a Glance
                </h2>
                <p className={sectionLede}>Where your questions stand.</p>
              </div>
              <StaggerGrid className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-1">
                <StatCard
                  image={art.waiting}
                  label="Waiting"
                  value={loading ? "–" : String(stats.waiting)}
                  note="Not answered yet"
                />
                <StatCard
                  image={art.answered}
                  label="Answered"
                  value={loading ? "–" : String(stats.answered)}
                  note="Answered or closed"
                />
              </StaggerGrid>
            </aside>
          </div>
        </section>
      </main>
    </PageTransition>
  );
}
