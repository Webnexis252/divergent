"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";

type FlaggedPost = {
  id: string;
  title: string;
  body: string;
  isFlagged: boolean;
  flagReason: string | null;
  createdAt: string;
  author: { id: string; name: string | null; email: string | null; image: string | null };
  channel: { id: string; name: string } | null;
  _count: { likes: number; replies: number };
};

type OverdueReview = {
  attemptId: string;
  studentName: string;
  courseTitle: string;
  examTitle: string;
  submittedAt: string;
  assignedTeachers: string[];
};

function ModerationPostCard({
  post,
  deletingId,
  onDelete,
  onUnflag,
}: {
  post: FlaggedPost;
  deletingId: string | null;
  onDelete: (postId: string) => void;
  onUnflag: (postId: string) => void;
}) {
  const initials = post.author.name?.charAt(0).toUpperCase() ?? '?';
  const colors = ["#e53935", "#d81b60", "#8e24aa", "#3949ab", "#039be5", "#00897b", "#43a047", "#f4511e"];
  const colorIndex = post.author.id ? post.author.id.charCodeAt(0) % colors.length : 0;
  const authorColor = colors[colorIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full mb-4`}
    >
      <div className="flex-shrink-0 mr-3 mt-1">
        {post.author.image ? (
          <Image src={post.author.image} alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover shadow-sm" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-white font-bold shadow-sm text-sm" style={{ backgroundColor: authorColor }}>
            {initials}
          </div>
        )}
      </div>

      <div className="flex flex-col w-full">
        <div className={`relative rounded-[16px] rounded-tl-sm px-4 py-3 shadow-sm border ${
          post.isFlagged ? "border-red-300 bg-[#fff5f5]" : "border-[#e5e7eb] bg-white"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px]" style={{ color: authorColor }}>
                {post.author.name ?? 'Anonymous'}
              </span>
              <span className="text-[12px] text-[#94a3b8]">{post.author.email}</span>
              {post.channel && (
                <span className="text-[11px] text-[#38c1ff] font-medium bg-[#f0f9ff] px-2 py-0.5 rounded-full">
                  #{post.channel.name}
                </span>
              )}
              {post.isFlagged && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase tracking-wider">
                  Flagged
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {post.isFlagged && (
                <button onClick={() => onUnflag(post.id)} className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                  Approve
                </button>
              )}
              <button onClick={() => onDelete(post.id)} disabled={deletingId === post.id} className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingId === post.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          <h4 className="text-[15px] font-bold text-black mb-1">{post.title}</h4>
          
          {post.body && (
            <p className="text-[14px] leading-relaxed text-[#303030] whitespace-pre-wrap">
              {post.body}
            </p>
          )}

          {post.flagReason && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-700 flex gap-2 items-start">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div>
                <span className="font-semibold">Flag reason:</span> {post.flagReason}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-black/5 text-[11px] text-[#8b8888]">
            <span>{new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="flex items-center gap-1"><span>👍</span> {post._count.likes}</span>
            <span className="flex items-center gap-1"><span>💬</span> {post._count.replies}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function AdminModerationPage() {
  const [posts, setPosts] = useState<FlaggedPost[]>([]);
  const [overdueReviews, setOverdueReviews] = useState<OverdueReview[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const flagged = posts.filter((post) => post.isFlagged);

  const load = () => {
    Promise.all([
      fetch("/api/admin/moderation").then(r => r.json()),
      fetch("/api/admin/moderation/overdue-reviews").then(r => r.json())
    ]).then(([postsJson, overdueJson]) => {
      if (postsJson.success) {
        setPosts(postsJson.data.posts);
        setTotalPosts(postsJson.data.totalPosts);
      }
      if (overdueJson.success) {
        setOverdueReviews(overdueJson.data.overdueReviews);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
    try {
      const res = await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } finally { setDeletingId(null); }
  };

  const handleUnflag = async (postId: string) => {
    const res = await fetch(`/api/community/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFlagged: false, flagReason: null }),
    });
    if (res.ok) {
      setPosts(prev =>
        prev.map(post =>
          post.id === postId
            ? { ...post, isFlagged: false, flagReason: null }
            : post,
        ),
      );
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10 lg:px-10">

        <RevealSection>
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-[#dc2626] via-[#ef4444] to-[#f97316] px-8 py-10 text-white shadow-[0_24px_60px_rgba(220,38,38,0.25)]">
            <motion.div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full bg-white/10 blur-3xl" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 5, repeat: Infinity }} />
            <div className="relative z-10">
              <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-widest">🛡️ Safety</div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight">Content Moderation</h1>
              <p className="mt-2 text-white/80">Review and manage flagged community posts to maintain platform safety.</p>
            </div>
          </div>
        </RevealSection>

        <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-4">
          <AdminStatCard index={0} title="Total Posts" value={loading ? "…" : totalPosts} caption="Community posts." tone="sky" />
          <AdminStatCard index={1} title="Flagged" value={loading ? "…" : flagged.length} caption="Awaiting review." tone="amber" />
          <AdminStatCard index={2} title="Flag Rate" value={loading ? "…" : totalPosts > 0 ? `${((flagged.length / totalPosts) * 100).toFixed(1)}%` : "0%"} caption="Of all posts." tone="slate" />
          <AdminStatCard index={3} title="Overdue Reviews" value={loading ? "…" : overdueReviews.length} caption=">24h SLA breached." tone="rose" />
        </StaggerGrid>

        {overdueReviews.length > 0 && (
          <div className="rounded-[28px] bg-red-50 border border-red-200 shadow-[0px_4px_20px_rgba(220,38,38,0.06)] overflow-hidden">
            <div className="border-b border-red-200 px-6 py-5 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold text-red-700 flex items-center gap-2">
                  <span className="animate-pulse">🚨</span> SLA Breaches: Overdue Sketch Evaluations
                </h2>
                <p className="text-[13px] text-red-600/80 mt-1">Teachers have not evaluated these sketch questions for over 24 hours.</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {overdueReviews.map((review) => {
                const hoursOverdue = Math.floor((Date.now() - new Date(review.submittedAt).getTime()) / (1000 * 60 * 60));
                return (
                  <div key={review.attemptId} className="bg-white p-4 rounded-[16px] shadow-sm border border-red-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-[15px] font-bold text-gray-900">{review.examTitle}</h4>
                      <div className="text-[13px] text-gray-600 flex items-center gap-2 mt-1">
                        <span>Course: <strong>{review.courseTitle}</strong></span>
                        <span>•</span>
                        <span>Student: <strong>{review.studentName}</strong></span>
                      </div>
                      <div className="mt-2 text-[12px] font-medium text-red-600 bg-red-100/50 w-fit px-2 py-1 rounded">
                        Assigned Teachers: {review.assignedTeachers.length > 0 ? review.assignedTeachers.join(", ") : "None"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-red-600">{hoursOverdue}h</div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-red-400">Overdue</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-[28px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <div className="border-b px-6 py-5">
            <h2 className="text-[18px] font-semibold text-[#101828]">Flagged Posts</h2>
          </div>
          <div className="p-6 space-y-4">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-[16px] bg-gray-100" />)
            ) : flagged.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[48px]">✅</p>
                <p className="mt-4 text-[18px] font-semibold text-[#101828]">No flagged posts</p>
                <p className="mt-2 text-[14px] text-[#94a3b8]">The community is clean. No reports to review.</p>
              </div>
            ) : (
              flagged.map((post) => (
                <ModerationPostCard
                  key={post.id}
                  post={post}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                  onUnflag={handleUnflag}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.06)]">
          <div className="border-b px-6 py-5">
            <h2 className="text-[18px] font-semibold text-[#101828]">All Community Posts</h2>
            <p className="mt-1 text-[13px] text-[#94a3b8]">
              Delete any community post from here, whether it has been flagged or not.
            </p>
          </div>
          <div className="space-y-4 p-6">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-[16px] bg-gray-100" />)
            ) : posts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[48px]">📝</p>
                <p className="mt-4 text-[18px] font-semibold text-[#101828]">No community posts yet</p>
                <p className="mt-2 text-[14px] text-[#94a3b8]">
                  Posts will appear here once learners or mentors start publishing.
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <ModerationPostCard
                  key={post.id}
                  post={post}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                  onUnflag={handleUnflag}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
