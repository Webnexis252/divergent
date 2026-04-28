"use client";

import { useEffect, useState } from "react";
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

export default function AdminModerationPage() {
  const [flagged, setFlagged] = useState<FlaggedPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/moderation")
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setFlagged(json.data.flaggedPosts);
          setTotalPosts(json.data.totalPosts);
        }
      }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
    try {
      await fetch(`/api/community/posts/${postId}`, { method: "DELETE" });
      setFlagged(prev => prev.filter(p => p.id !== postId));
    } finally { setDeletingId(null); }
  };

  const handleUnflag = async (postId: string) => {
    await fetch(`/api/community/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFlagged: false }),
    });
    setFlagged(prev => prev.filter(p => p.id !== postId));
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

        <StaggerGrid className="grid grid-cols-2 gap-5 md:grid-cols-3">
          <AdminStatCard index={0} title="Total Posts" value={loading ? "…" : totalPosts} caption="Community posts." tone="sky" />
          <AdminStatCard index={1} title="Flagged" value={loading ? "…" : flagged.length} caption="Awaiting review." tone="amber" />
          <AdminStatCard index={2} title="Flag Rate" value={loading ? "…" : totalPosts > 0 ? `${((flagged.length / totalPosts) * 100).toFixed(1)}%` : "0%"} caption="Of all posts." tone="slate" />
        </StaggerGrid>

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
              flagged.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="rounded-[16px] border border-red-200 bg-red-50/40 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {post.author.image ? (
                        <img src={post.author.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-200 text-[14px] font-bold text-red-700">
                          {post.author.name?.charAt(0) ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-[#101828]">{post.author.name ?? "Anonymous"}</p>
                        <p className="text-[12px] text-[#94a3b8]">{post.author.email} {post.channel && `· #${post.channel.name}`}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleUnflag(post.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 border">Approve</button>
                      <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        {deletingId === post.id ? "Deleting…" : "Delete Post"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="font-semibold text-[#101828]">{post.title}</p>
                    <p className="mt-1 text-[13px] text-[#595959] line-clamp-3">{post.body}</p>
                  </div>
                  {post.flagReason && (
                    <div className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-[12px] text-red-700">
                      <span className="font-semibold">Flag reason:</span> {post.flagReason}
                    </div>
                  )}
                  <div className="mt-3 flex gap-4 text-[12px] text-[#94a3b8]">
                    <span>{post._count.likes} likes</span>
                    <span>{post._count.replies} replies</span>
                    <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
