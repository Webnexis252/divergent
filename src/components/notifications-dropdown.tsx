"use client";

import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cx } from "@/lib/cx";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ERROR" | string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}

const typeStyles: Record<string, { dot: string; text: string }> = {
  SUCCESS: { dot: "bg-[#4caf50]", text: "text-[#4caf50]" },
  WARNING: { dot: "bg-[#ffc107]", text: "text-[#ffc107]" },
  ERROR:   { dot: "bg-[#ff5e2f]", text: "text-[#ff5e2f]" },
  INFO:    { dot: "bg-[#38c1ff]", text: "text-[#38c1ff]" },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
      setFetchError(false);
    } catch (error) {
      console.error("[NOTIFICATIONS_FETCH_ERROR]", error);
      setFetchError(true);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and poll every 30s
  useEffect(() => {
    void fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("[NOTIFICATIONS_MARK_READ_ERROR]", error);
      void fetchNotifications();
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
    } catch (error) {
      console.error("[NOTIFICATIONS_MARK_ALL_READ_ERROR]", error);
      void fetchNotifications();
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/5"
        onClick={() => setOpen((s) => !s)}
        type="button"
      >
        <Bell className="h-5 w-5 text-black/60" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              animate={{ scale: 1 }}
              className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ff3d00] px-1 text-[9px] font-bold leading-none text-white"
              exit={{ scale: 0 }}
              initial={{ scale: 0 }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute left-1/2 top-[calc(100%+10px)] z-50 w-[min(calc(100vw-1.5rem),380px)] -translate-x-1/2 overflow-hidden rounded-[20px] border border-black/8 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.16)] sm:left-auto sm:right-0 sm:w-[380px] sm:translate-x-0"
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
              <div>
                <p className="text-[15px] font-semibold text-black">Notifications</p>
                {unreadCount > 0 && (
                  <p className="text-[12px] text-black/50">{unreadCount} unread</p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-[#38c1ff] transition-colors hover:bg-[#38c1ff]/10"
                  onClick={markAllRead}
                  type="button"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div
                    animate={{ rotate: 360 }}
                    className="h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent"
                    transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : fetchError ? (
                <div className="px-5 py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-black/15" />
                  <p className="mt-3 text-[14px] text-black/55">Notifications are unavailable right now.</p>
                  <button
                    className="mt-4 rounded-[10px] bg-[#38c1ff]/10 px-3 py-2 text-[12px] font-medium text-[#0b88be] transition-colors hover:bg-[#38c1ff]/15"
                    onClick={() => {
                      setLoading(true);
                      void fetchNotifications();
                    }}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Bell className="mx-auto h-8 w-8 text-black/15" />
                  <p className="mt-3 text-[14px] text-black/40">You&apos;re all caught up!</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const style = typeStyles[n.type] ?? typeStyles.INFO;
                  const inner = (
                    <div
                      className={cx(
                        "group flex items-start gap-3 border-b border-black/5 px-5 py-4 transition-colors last:border-0 hover:bg-black/[0.025]",
                        !n.isRead && "bg-[#38c1ff]/[0.04]",
                      )}
                    >
                      <span
                        className={cx(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          n.isRead ? "bg-black/15" : style.dot,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cx("text-[13px] font-semibold leading-snug", n.isRead ? "text-black/70" : "text-black")}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-black/55">
                          {n.body}
                        </p>
                        <p className="mt-1.5 text-[11px] text-black/35">{timeAgo(n.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {n.actionUrl && (
                          <span className="rounded-md p-1 text-black/25 hover:text-[#38c1ff]">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {!n.isRead && (
                          <button
                            aria-label="Mark as read"
                            className="rounded-md p-1 text-black/25 hover:text-[#38c1ff]"
                            onClick={(e) => { e.preventDefault(); void markRead(n.id); }}
                            type="button"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );

                  return n.actionUrl ? (
                    <Link href={n.actionUrl} key={n.id} onClick={() => { if (!n.isRead) void markRead(n.id); }}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={n.id}>{inner}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
