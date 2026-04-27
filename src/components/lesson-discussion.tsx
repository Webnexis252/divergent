"use client";

import { MessageCircle, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cx } from "@/lib/cx";
import { useAuth } from "@/context/auth-context";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
  role: string;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ author }: { author: Author }) {
  const initials = (author.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isMentor = author.role === "MENTOR" || author.role === "ADMIN";

  return (
    <div
      className={cx(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white",
        isMentor ? "bg-[#925fe2]" : "bg-[#38c1ff]",
      )}
    >
      {author.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={author.name ?? ""} className="h-8 w-8 rounded-full object-cover" src={author.image} />
      ) : (
        initials
      )}
    </div>
  );
}

function MessageBubble({ message, currentUserId }: { message: Message; currentUserId: string }) {
  const isOwn = message.author.id === currentUserId;
  const isMentor = message.author.role === "MENTOR" || message.author.role === "ADMIN";

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className={cx("flex gap-3", isOwn && "flex-row-reverse")}
      initial={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
    >
      <Avatar author={message.author} />
      <div className={cx("flex min-w-0 max-w-[80%] flex-col gap-1", isOwn && "items-end")}>
        <div className="flex items-center gap-2">
          <span className={cx("text-[12px] font-semibold", isMentor ? "text-[#925fe2]" : "text-black/60")}>
            {isOwn ? "You" : (message.author.name ?? "Student")}
          </span>
          {isMentor && (
            <span className="rounded-full bg-[#925fe2]/10 px-2 py-0.5 text-[9px] font-semibold text-[#925fe2]">
              Mentor
            </span>
          )}
          <span className="text-[11px] text-black/30">{timeAgo(message.createdAt)}</span>
        </div>
        <div
          className={cx(
            "rounded-[14px] px-4 py-2.5 text-[14px] leading-relaxed",
            isOwn
              ? "rounded-tr-[4px] bg-[#38c1ff] text-white"
              : "rounded-tl-[4px] bg-[#f3f4f6] text-black",
          )}
        >
          {message.body}
        </div>
      </div>
    </motion.div>
  );
}

export function LessonDiscussion({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/discussions`);
      const json = await res.json();
      if (json.data?.messages) setMessages(json.data.messages);
    } catch {
      // silently ignore
    }
  }, [lessonId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
    const id = setInterval(fetchMessages, 15_000);
    return () => clearInterval(id);
  }, [open, fetchMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      const json = await res.json();
      if (json.data?.message) {
        setMessages((prev) => [...prev, json.data.message]);
        setBody("");
      }
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mt-8">
      {/* Toggle header */}
      <button
        className="flex w-full items-center justify-between rounded-[16px] bg-[#f7f5f4] px-5 py-4 text-left transition-colors hover:bg-black/5"
        onClick={() => setOpen((s) => !s)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#38c1ff]/10">
            <MessageCircle className="h-5 w-5 text-[#38c1ff]" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-black">Lesson Discussion</p>
            <p className="text-[12px] text-black/50">
              {messages.length > 0
                ? `${messages.length} message${messages.length !== 1 ? "s" : ""}`
                : "Ask a question or discuss this lesson"}
            </p>
          </div>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          className="text-black/30"
          transition={{ duration: 0.2 }}
        >
          ▾
        </motion.span>
      </button>

      {/* Collapsible panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="mt-3 overflow-hidden rounded-[16px] border border-black/8 bg-white">
              {/* Messages area */}
              <div className="flex max-h-[420px] flex-col gap-4 overflow-y-auto p-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent"
                      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-black/15" />
                    <p className="mt-3 text-[14px] text-black/40">
                      No discussions yet. Be the first to ask a question!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      currentUserId={user?.id ?? ""}
                    />
                  ))
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <form
                className="flex gap-3 border-t border-black/5 px-5 py-4"
                onSubmit={handlePost}
              >
                <Avatar
                  author={{
                    id: user?.id ?? "",
                    name: user?.name ?? null,
                    image: null,
                    role: "STUDENT",
                  }}
                />
                <div className="flex flex-1 items-end gap-3">
                  <textarea
                    className="flex-1 resize-none rounded-[12px] border border-black/10 bg-[#f7f5f4] px-4 py-3 text-[14px] text-black placeholder:text-black/40 focus:border-[#38c1ff]/40 focus:outline-none focus:ring-2 focus:ring-[#38c1ff]/20"
                    disabled={posting}
                    maxLength={1000}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost(e);
                    }}
                    placeholder="Ask a question or share insights… (⌘Enter to send)"
                    rows={2}
                    value={body}
                  />
                  <motion.button
                    className={cx(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
                      body.trim()
                        ? "bg-[#38c1ff] text-white shadow-[0_4px_12px_rgba(56,193,255,0.3)]"
                        : "bg-black/8 text-black/30",
                    )}
                    disabled={posting || !body.trim()}
                    transition={{ duration: 0.15 }}
                    type="submit"
                    whileHover={body.trim() ? { scale: 1.08 } : undefined}
                    whileTap={body.trim() ? { scale: 0.94 } : undefined}
                  >
                    {posting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                        transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
