"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  CircleHelp,
  Clock3,
  MessageSquareText,
  Plus,
  SendHorizontal,
  House,
  BookOpen,
  CalendarDays,
  Video,
  NotebookPen,
  ChartNoAxesColumn,
  Award,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { cx } from "@/lib/cx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextAreaField } from "@/components/ui/field";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { DashboardSidebar } from "@/app/dashboard/_components/sidebar-nav";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
} from "../_components/motion-wrappers";

type DoubtReply = {
  id: string;
  body: string;
  createdAt: string;
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
  replies?: DoubtReply[];  // not included by the list API; fetched lazily on expand
  _count: { replies: number };
};

const priorityMeta = {
  LOW: { label: "Low priority", tone: "success" as const },
  MEDIUM: { label: "Normal priority", tone: "warning" as const },
  HIGH: { label: "Urgent priority", tone: "danger" as const },
} as const;

const statusMeta = {
  OPEN: { label: "Open", tone: "warning" as const },
  ASSIGNED: { label: "Assigned", tone: "brand" as const },
  RESOLVED: { label: "Resolved", tone: "success" as const },
  CLOSED: { label: "Closed", tone: "neutral" as const },
} as const;

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} day${diff >= 172800 ? "s" : ""} ago`;
}

function ReplyThread({ replies }: { replies?: DoubtReply[] }) {
  if (!replies || replies.length === 0) {
    return (
      <div className="rounded-(--radius-md) border border-dashed border-(--line-soft) px-4 py-6 text-[14px] text-(--text-muted)">
        No reply yet. Your mentors will respond here when they pick this up.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => {
        const isMentorReply =
          reply.author?.role === "MENTOR" ||
          reply.author?.role === "ADMIN" ||
          reply.author?.role === "SUPER_ADMIN";

        return (
          <div
            key={reply.id}
            className="rounded-(--radius-md) border border-(--line-soft) bg-white px-4 py-4 shadow-(--shadow-soft)"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-semibold text-(--text-strong)">
                {reply.author?.name ?? "Unknown"}
              </p>
              {isMentorReply ? <Badge tone="brandStrong">Mentor</Badge> : null}
              <span className="text-[12px] text-(--text-subtle)">
                {timeAgo(reply.createdAt)}
              </span>
            </div>
            <p className="mt-3 text-[14px] leading-7 text-(--text-muted)">
              {reply.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function DoubtCard({
  doubt,
  isExpanded,
  onToggle,
}: {
  doubt: Doubt;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.article
      className="overflow-hidden rounded-(--radius-xl) border border-(--line-soft) bg-white/84 shadow-(--shadow-soft)"
      layout
      transition={{ duration: 0.26 }}
    >
      <button
        className="flex w-full flex-col gap-4 px-5 py-5 text-left transition-colors duration-150 hover:bg-white focus-visible:outline-none sm:px-6"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={statusMeta[doubt.status].tone}>{statusMeta[doubt.status].label}</Badge>
              <Badge tone={priorityMeta[doubt.priority].tone}>
                {priorityMeta[doubt.priority].label}
              </Badge>
              <span className="inline-flex items-center gap-1 text-[12px] text-(--text-subtle)">
                <Clock3 className="h-3.5 w-3.5" />
                {timeAgo(doubt.createdAt)}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-[22px] font-semibold tracking-[-0.04em] text-(--text-strong)">
                {doubt.subject}
              </h3>
              <p className="max-w-[70ch] text-[14px] leading-7 text-(--text-muted)">
                {doubt.body}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <div className="rounded-(--radius-md) bg-(--brand-primary-soft) px-3 py-2 text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--text-subtle)">
                Replies
              </p>
              <p className="mt-1 text-[18px] font-semibold tracking-[-0.04em] text-(--brand-primary-dark)">
                {doubt._count.replies}
              </p>
            </div>
            <ChevronDown
              className={`h-5 w-5 text-(--text-subtle) transition-transform duration-150 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-(--line-soft) pt-4 text-[13px] text-(--text-subtle)">
          <span>Updated {timeAgo(doubt.updatedAt)}</span>
          <span className="h-1 w-1 rounded-full bg-(--text-subtle)/40" />
          <span>{doubt.mentor?.name ? `Assigned to ${doubt.mentor.name}` : "Waiting for mentor pickup"}</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden border-t border-(--line-soft) bg-[rgba(255,255,255,0.52)] px-5 py-5 sm:px-6"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <ReplyThread replies={doubt.replies} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
}

export default function DoubtsPage() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function fetchDoubts(background = false) {
    if (!background) setLoading(true);

    try {
      const response = await fetch("/api/doubts");
      const json = await response.json();

      if (json.success) {
        setDoubts((prev) => {
          return json.data.map((newDoubt: Doubt) => {
            const old = prev.find((d) => d.id === newDoubt.id);
            if (old && old.replies) {
              return { ...newDoubt, replies: old.replies };
            }
            return newDoubt;
          });
        });
      }
    } catch (error) {
      console.error("Failed to fetch doubts", error);
    } finally {
      if (!background) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchDoubts();
    const interval = setInterval(() => {
      fetchDoubts(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    const open = doubts.filter(
      (doubt) => doubt.status === "OPEN" || doubt.status === "ASSIGNED",
    ).length;
    const resolved = doubts.filter(
      (doubt) => doubt.status === "RESOLVED" || doubt.status === "CLOSED",
    ).length;

    return {
      open,
      resolved,
      replies: doubts.reduce((count, doubt) => count + doubt._count.replies, 0),
    };
  }, [doubts]);

  useEffect(() => {
    if (!expandedId) return;
    const interval = setInterval(() => {
      fetch(`/api/doubts/${expandedId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setDoubts((current) =>
              current.map((item) =>
                item.id === expandedId ? { ...item, replies: json.data.replies } : item
              )
            );
          }
        })
        .catch(console.error);
    }, 3000);
    return () => clearInterval(interval);
  }, [expandedId]);

  async function handleToggle(doubt: Doubt) {
    if (expandedId === doubt.id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(doubt.id);

    // replies is undefined until fetched; treat missing/empty as needing a fetch
    if (doubt.replies && doubt.replies.length > 0) {
      return;
    }

    try {
      const response = await fetch(`/api/doubts/${doubt.id}`);
      const json = await response.json();

      if (json.success) {
        setDoubts((current) =>
          current.map((item) =>
            item.id === doubt.id ? { ...item, replies: json.data.replies } : item,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to fetch doubt detail", error);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!subject.trim() || !body.trim()) {
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/doubts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          priority,
          subject,
        }),
      });
      const json = await response.json();

      if (json.success || response.status === 201) {
        setSubject("");
        setBody("");
        setPriority("MEDIUM");
        setShowComposer(false);
        void fetchDoubts();
        return;
      }

      setErrorMsg(json.error || json.message || "Could not submit the doubt right now.");
    } catch (error) {
      console.error("Failed to submit doubt", error);
      setErrorMsg("Could not submit the doubt right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="text-black bg-[#f9fafb] min-h-screen pb-24 sm:bg-[#f7f5f4] sm:pb-0">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 text-black lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <DashboardSidebar />

        <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-6">
          <div className="mx-auto max-w-[1180px] space-y-8">
            <RevealSection>
              <Surface className="relative overflow-hidden px-6 py-7 sm:px-8 sm:py-8">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-[30%] bg-[radial-gradient(circle_at_center,rgba(56,193,255,0.14),transparent_72%)]" />
                <div className="relative z-10 space-y-8">
                  <SectionHeading
                    action={
                      <Button
                        onClick={() => setShowComposer((current) => !current)}
                        size="lg"
                      >
                        <Plus className="h-4 w-4" />
                        {showComposer ? "Hide composer" : "Ask a doubt"}
                      </Button>
                    }
                    eyebrow="Mentor Support"
                    title="Questions deserve the same level of polish as the lessons."
                    description="Capture a doubt clearly, track whether it is still open, and keep the reply thread readable without the page turning into a utility dump."
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      accent="var(--brand-primary-strong)"
                      icon={<CircleHelp className="h-5 w-5" />}
                      label="Open Threads"
                      meta="Questions that still need a mentor response or follow-up."
                      value={stats.open}
                    />
                    <MetricCard
                      accent="var(--success)"
                      icon={<MessageSquareText className="h-5 w-5" />}
                      label="Resolved"
                      meta="Doubts that have already been answered or wrapped up."
                      value={stats.resolved}
                    />
                    <MetricCard
                      accent="var(--warning)"
                      icon={<SendHorizontal className="h-5 w-5" />}
                      label="Replies Shared"
                      meta="Total responses exchanged across your active doubt threads."
                      value={stats.replies}
                    />
                  </div>
                </div>
              </Surface>
            </RevealSection>

            <AnimatePresence initial={false}>
              {showComposer ? (
                <RevealSection delay={0.04}>
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    initial={{ opacity: 0, y: -12 }}
                  >
                    <Surface className="px-6 py-6 sm:px-8">
                      <div className="mb-6 space-y-2">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-(--text-subtle)">
                          New Doubt
                        </p>
                        <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-(--text-strong)">
                          Write it once, clearly.
                        </h2>
                        <p className="text-[14px] leading-7 text-(--text-muted)">
                          Add the exact problem, what you already tried, and how urgent it is so mentors can respond with context instead of guesswork.
                        </p>
                        <p className="text-[13px] font-medium text-(--text-subtle)">
                          Submitting a doubt uses 25 XP from your account.
                        </p>
                      </div>

                      <form className="space-y-5" onSubmit={handleSubmit}>
                        <Field
                          label="Subject"
                          onChange={(event) => setSubject(event.target.value)}
                          placeholder="Example: I am stuck on perspective drawing for the sketching module"
                          value={subject}
                        />

                        <TextAreaField
                          label="Details"
                          onChange={(event) => setBody(event.target.value)}
                          placeholder="Describe the problem, what lesson or assignment it belongs to, and what you already tried."
                          value={body}
                        />

                        <div className="space-y-3">
                          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-(--text-muted)">
                            Priority
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {(["LOW", "MEDIUM", "HIGH"] as const).map((item) => {
                              const active = priority === item;

                              return (
                                <button
                                  key={item}
                                  className={`rounded-(--radius-pill) border px-4 py-2 text-[14px] font-semibold transition-[border-color,background-color,color,transform] duration-150 ease-out focus-visible:outline-none ${
                                    active
                                      ? "border-transparent bg-(--brand-primary-strong) text-white shadow-(--shadow-accent)"
                                      : "border-(--line-soft) bg-white text-(--text-muted) hover:border-(--line-strong) hover:text-(--text-strong)"
                                  }`}
                                  onClick={() => setPriority(item)}
                                  type="button"
                                >
                                  {priorityMeta[item].label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {errorMsg ? (
                          <div className="rounded-(--radius-md) border border-[rgba(255,61,0,0.16)] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[14px] text-(--danger)">
                            {errorMsg}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center gap-3">
                          <Button
                            disabled={!subject.trim() || !body.trim()}
                            loading={submitting}
                            size="lg"
                            type="submit"
                          >
                            Submit doubt
                          </Button>
                          <Button
                            onClick={() => setShowComposer(false)}
                            size="lg"
                            type="button"
                            variant="secondary"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Surface>
                  </motion.div>
                </RevealSection>
              ) : null}
            </AnimatePresence>

            <RevealSection delay={0.08}>
              {loading ? (
                <Surface className="flex items-center justify-center gap-3 px-6 py-16 text-(--text-muted)">
                  <motion.div
                    animate={{ rotate: 360 }}
                    className="h-5 w-5 rounded-full border-2 border-(--brand-primary-strong) border-t-transparent"
                    transition={{ duration: 0.9, ease: "linear", repeat: Number.POSITIVE_INFINITY }}
                  />
                  Loading your doubt threads...
                </Surface>
              ) : doubts.length === 0 ? (
                <EmptyState
                  action={
                    <Button onClick={() => setShowComposer(true)} size="lg">
                      <Plus className="h-4 w-4" />
                      Ask your first doubt
                    </Button>
                  }
                  description="Once you send a question, it will appear here with its status, response history, and the latest mentor activity."
                  icon={<CircleHelp className="h-6 w-6" />}
                  title="No doubts yet"
                />
              ) : (
                <StaggerGrid className="space-y-4">
                  {doubts.map((doubt) => (
                    <DoubtCard
                      key={doubt.id}
                      doubt={doubt}
                      isExpanded={expandedId === doubt.id}
                      onToggle={() => void handleToggle(doubt)}
                    />
                  ))}
                </StaggerGrid>
              )}
            </RevealSection>
          </div>
        </section>
      </div>
    </PageTransition>
    </div>
  );
}
