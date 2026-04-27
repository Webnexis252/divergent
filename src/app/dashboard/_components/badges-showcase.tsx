"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Award, Lock, Star, Trophy } from "lucide-react";

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  xpReward: number;
  earned: boolean;
  earnedAt: string | null;
}

interface BadgesData {
  badges: BadgeItem[];
  totalXP: number;
  earnedCount: number;
  totalCount: number;
}

const badgeIcons = [Trophy, Star, Award] as const;

function BadgeCard({ badge, index }: { badge: BadgeItem; index: number }) {
  const IconComponent = badgeIcons[index % badgeIcons.length];

  return (
    <motion.div
      className={`relative flex flex-col items-center gap-3 rounded-[var(--radius-xl)] border px-5 py-6 text-center transition-colors ${
        badge.earned
          ? "border-[rgba(56,193,255,0.25)] bg-white shadow-[var(--shadow-soft)]"
          : "border-dashed border-[var(--line-soft)] bg-[var(--bg-secondary)] opacity-60"
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: badge.earned ? 1 : 0.6, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      whileHover={
        badge.earned
          ? { y: -4, boxShadow: "0 14px 28px rgba(56,193,255,0.14)" }
          : undefined
      }
    >
      {!badge.earned ? (
        <div className="absolute right-3 top-3 text-[var(--text-subtle)]">
          <Lock className="h-3.5 w-3.5" />
        </div>
      ) : null}

      <div
        className={`grid h-14 w-14 place-items-center rounded-full ${
          badge.earned
            ? "bg-[var(--brand-primary-soft)] text-[var(--brand-primary-strong)]"
            : "bg-[var(--line-soft)] text-[var(--text-subtle)]"
        }`}
      >
        {badge.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={badge.name}
            className="h-8 w-8 rounded-full object-cover"
            src={badge.imageUrl}
          />
        ) : (
          <IconComponent className="h-6 w-6" />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-[var(--text-strong)]">
          {badge.name}
        </p>
        <p className="text-[12px] leading-5 text-[var(--text-muted)]">
          {badge.description}
        </p>
      </div>

      <div className="text-[11px] font-semibold text-[var(--brand-primary-strong)]">
        +{badge.xpReward} XP
      </div>

      {badge.earned && badge.earnedAt ? (
        <p className="text-[10px] text-[var(--text-subtle)]">
          Earned{" "}
          {new Date(badge.earnedAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </p>
      ) : null}
    </motion.div>
  );
}

export function BadgesShowcase() {
  const [data, setData] = useState<BadgesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/me/badges")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
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
        Loading badges…
      </div>
    );
  }

  if (!data || data.badges.length === 0) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-[#fbbf24]" />
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-strong)]">
            Achievements
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-[var(--radius-pill)] bg-[#fffbeb] px-3 py-1 text-[12px] font-semibold text-[#d97706]">
            {data.totalXP} XP
          </span>
          <span className="text-[13px] text-[var(--text-subtle)]">
            {data.earnedCount}/{data.totalCount} unlocked
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {data.badges.map((badge, i) => (
          <BadgeCard key={badge.id} badge={badge} index={i} />
        ))}
      </div>
    </section>
  );
}
