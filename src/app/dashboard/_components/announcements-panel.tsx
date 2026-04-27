"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Megaphone, Pin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  targetRole: string | null;
  createdAt: string;
  author: { name: string | null; image: string | null };
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAnnouncements(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-[14px] text-[var(--text-muted)]">
        <motion.div
          animate={{ rotate: 360 }}
          className="h-4 w-4 rounded-full border-2 border-[var(--brand-primary-strong)] border-t-transparent"
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        />
        Loading announcements…
      </div>
    );
  }

  if (announcements.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-[var(--brand-primary-strong)]" />
        <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
          Announcements
        </h2>
        <Badge tone="brand">{announcements.length}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {announcements.map((a, i) => (
          <motion.article
            key={a.id}
            className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line-soft)] bg-white px-5 py-4 shadow-[var(--shadow-soft)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.06,
              duration: 0.4,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            whileHover={{
              y: -4,
              boxShadow: "0 14px 28px rgba(0,0,0,0.08)",
            }}
          >
            {a.isPinned ? (
              <div className="absolute right-3 top-3 text-[var(--warning)]">
                <Pin className="h-4 w-4" />
              </div>
            ) : null}

            <div className="space-y-2">
              <h3 className="pr-6 text-[15px] font-semibold text-[var(--text-strong)]">
                {a.title}
              </h3>
              <p className="line-clamp-3 text-[13px] leading-6 text-[var(--text-muted)]">
                {a.body}
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-[var(--line-soft)] pt-3 text-[12px] text-[var(--text-subtle)]">
              <span className="font-medium">{a.author.name ?? "Admin"}</span>
              <span>·</span>
              <span>{timeAgo(a.createdAt)}</span>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
