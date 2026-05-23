"use client";

import { useState, useEffect } from "react";
import { Trophy, Clock, Medal, Loader2 } from "lucide-react";

type LeaderboardEntry = {
  rank: number;
  studentName: string;
  studentImage: string | null;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  timeSpentSecs: number | null;
  gradingStatus: string;
  isCurrentUser: boolean;
};

function formatDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

const RANK_STYLES: Record<number, { bg: string; text: string; icon: string; scale: string; shadow: string }> = {
  1: { 
    bg: "bg-gradient-to-br from-[#fde68a] via-[#f59e0b] to-[#d97706]", 
    text: "text-white text-shadow-sm", 
    icon: "🥇",
    scale: "scale-[1.05] z-10",
    shadow: "shadow-2xl shadow-amber-500/40 border border-amber-300/50"
  },
  2: { 
    bg: "bg-gradient-to-br from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8]", 
    text: "text-white text-shadow-sm", 
    icon: "🥈",
    scale: "scale-100",
    shadow: "shadow-xl shadow-slate-500/30 border border-slate-300/50"
  },
  3: { 
    bg: "bg-gradient-to-br from-[#fed7aa] via-[#f97316] to-[#c2410c]", 
    text: "text-white text-shadow-sm", 
    icon: "🥉",
    scale: "scale-[0.98]",
    shadow: "shadow-xl shadow-orange-500/30 border border-orange-300/50"
  },
};

export function LeaderboardPanel({
  courseId,
  testId,
}: {
  courseId: string;
  testId: string;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    fetch(`/api/courses/${courseId}/tests/${testId}/leaderboard`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!mounted) return;
        if (json.success && Array.isArray(json.data)) {
          setEntries(json.data);
        }
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        setError("Could not load leaderboard");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [courseId, testId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-[#9ca3af]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading leaderboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[14px] bg-red-50 px-4 py-3 text-[13px] text-red-600 border border-red-100">
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-[14px] border-2 border-dashed border-[#e5e7eb] py-8 text-center text-[#9ca3af]">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-[14px] font-medium">No submissions yet</p>
        <p className="text-[12px] mt-1">Be the first to appear on the leaderboard!</p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="space-y-4">
      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {top3.map((entry) => {
          const style = RANK_STYLES[entry.rank] ?? { bg: "bg-gray-100", text: "text-gray-800", icon: "", scale: "", shadow: "" };
          return (
            <div
              key={entry.rank}
              className={`relative rounded-[24px] p-5 text-center transition-all duration-300 hover:scale-105 ${style.bg} ${style.text} ${style.scale} ${style.shadow} ${
                entry.isCurrentUser ? "ring-4 ring-white/70 ring-offset-2 ring-offset-blue-50" : ""
              }`}
            >
              <div className="text-3xl mb-2 drop-shadow-md">{style.icon}</div>
              <div className="flex items-center justify-center mb-2">
                {entry.studentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.studentImage}
                    alt=""
                    className="h-10 w-10 rounded-full border-2 border-white/50 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-[14px] font-bold">
                    {entry.studentName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-[14px] font-bold truncate mt-1 tracking-wide">{entry.studentName}</p>
              <p className="text-[24px] font-extrabold mt-1 drop-shadow-sm">{entry.score}%</p>
              <p className="text-[12px] opacity-90 mt-0.5 font-medium">
                {entry.pointsEarned}/{entry.totalPoints} pts
              </p>
              {entry.timeSpentSecs && (
                <div className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
                  <Clock className="h-3 w-3" />
                  {formatDuration(entry.timeSpentSecs)}
                </div>
              )}
              {entry.gradingStatus === "PENDING_REVIEW" && (
                <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                  Pending
                </span>
              )}
              {entry.isCurrentUser && (
                <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/30 rounded-full px-1.5 py-0.5">
                  You
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Remaining entries */}
      {rest.length > 0 && (
        <div className="rounded-[20px] border border-[#e8eaef] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e8eaef] text-[12px] font-bold uppercase tracking-widest text-[#64748b]">
                <th className="px-5 py-3.5 text-left">#</th>
                <th className="px-5 py-3.5 text-left">Student</th>
                <th className="px-4 py-2.5 text-right">Score</th>
                <th className="px-4 py-2.5 text-right hidden sm:table-cell">Points</th>
                <th className="px-4 py-2.5 text-right hidden sm:table-cell">Time</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`border-b last:border-0 border-[#f1f5f9] transition duration-200 hover:bg-[#f8fafc] ${
                    entry.isCurrentUser ? "bg-[#eff6ff] font-semibold" : ""
                  }`}
                >
                  <td className="px-5 py-4 text-[#94a3b8] font-black">{entry.rank}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {entry.studentImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.studentImage} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">
                          {entry.studentName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate text-[#111827]">
                        {entry.studentName}
                        {entry.isCurrentUser && <span className="ml-1 text-[#38c1ff] text-[11px]">(You)</span>}
                      </span>
                      {entry.gradingStatus === "PENDING_REVIEW" && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-[#111827]">{entry.score}%</td>
                  <td className="px-4 py-3 text-right text-[#6b7280] hidden sm:table-cell">
                    {entry.pointsEarned}/{entry.totalPoints}
                  </td>
                  <td className="px-4 py-3 text-right text-[#6b7280] hidden sm:table-cell">
                    {formatDuration(entry.timeSpentSecs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
