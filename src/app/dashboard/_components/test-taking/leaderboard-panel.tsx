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

const RANK_STYLES: Record<number, { bg: string; text: string; icon: string; shadow: string }> = {
  1: { 
    bg: "bg-white", 
    text: "text-[#1e293b]", 
    icon: "1st",
    shadow: "shadow-sm border border-gray-100"
  },
  2: { 
    bg: "bg-white", 
    text: "text-[#1e293b]", 
    icon: "2nd",
    shadow: "shadow-sm border border-gray-100"
  },
  3: { 
    bg: "bg-white", 
    text: "text-[#1e293b]", 
    icon: "3rd",
    shadow: "shadow-sm border border-gray-100"
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
      <div className="rounded-[14px] border border-[#e5e7eb] py-12 text-center text-[#9ca3af] bg-white">
        <Trophy className="h-8 w-8 mx-auto mb-3 text-gray-300" />
        <p className="text-[16px] font-semibold text-gray-800">No submissions yet</p>
        <p className="text-[14px] mt-1 text-gray-500">Be the first to appear on the leaderboard!</p>
      </div>
    );
  }

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-8">
        <h2 className="text-[24px] font-bold text-[#111827]">Where Do You Stand?</h2>
        <span className="text-[14px] font-semibold text-gray-600">Total Learners <span className="text-gray-900 ml-1">{entries.length}</span></span>
      </div>

      {/* Top 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {top3.map((entry) => {
          const style = RANK_STYLES[entry.rank] ?? RANK_STYLES[3];
          return (
            <div
              key={entry.rank}
              className={`rounded-[12px] p-5 flex items-center justify-between ${style.bg} ${style.text} ${style.shadow} ${
                entry.isCurrentUser ? "ring-2 ring-[#0062ff]" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                {entry.studentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.studentImage}
                    alt=""
                    className="h-[46px] w-[46px] rounded-[10px] object-cover"
                  />
                ) : (
                  <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[10px] bg-[#bfdbfe] text-[#1d4ed8] text-[18px] font-bold">
                    {entry.studentName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-[15px] font-semibold text-[#1e293b] flex items-center gap-2">
                    {entry.studentName}
                    {entry.isCurrentUser && <span className="text-[11px] bg-[#0062ff] text-white px-2 py-0.5 rounded-full">You</span>}
                  </div>
                  <div className="text-[13px] font-medium text-gray-500 mt-0.5">
                    score - <span className="text-gray-800 font-semibold">{entry.score}</span>
                  </div>
                </div>
              </div>
              <div className="text-[16px] font-bold text-[#0f172a]">{style.icon}</div>
            </div>
          );
        })}
      </div>

      {/* Remaining entries table */}
      {rest.length > 0 && (
        <div className="w-full">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-gray-100 text-[14px] font-bold text-gray-800">
                <th className="px-4 py-4 text-left w-[80px]">#</th>
                <th className="px-4 py-4 text-left">Learner Name</th>
                <th className="px-4 py-4 text-right">score</th>
              </tr>
            </thead>
            <tbody>
              {rest.map((entry) => (
                <tr
                  key={entry.rank}
                  className={`border-b border-gray-50 transition duration-200 hover:bg-gray-50/50 ${
                    entry.isCurrentUser ? "bg-blue-50/30" : ""
                  }`}
                >
                  <td className="px-4 py-5 text-[#64748b] font-medium">{entry.rank}</td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      {entry.studentImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.studentImage} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fcd34d] text-[#b45309] text-[13px] font-bold">
                          {entry.studentName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className={`font-medium ${entry.isCurrentUser ? "text-[#0062ff] font-bold" : "text-[#1e293b]"}`}>
                        {entry.studentName}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[10px] bg-[#0062ff] text-white px-1.5 py-0.5 rounded-full ml-1">You</span>
                      )}
                      {entry.gradingStatus === "PENDING_REVIEW" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-5 text-right font-semibold text-[#1e293b]">
                    {entry.score}
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
