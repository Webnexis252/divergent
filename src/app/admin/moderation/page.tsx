"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { m as motion } from "motion/react";
import { PageTransition, RevealSection, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { AdminStatCard } from "../_components/AdminStatCard";
import { TriangleAlert, ThumbsUp, MessageCircle, ShieldAlert, Siren, CircleCheck, MessageSquareText, Percent } from "lucide-react";
import {
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminPanelHeader,
  StatusBadge,
  adminButtonSm,
  adminRowClass,
} from "../_components/admin-ui";

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
        <div className={`relative rounded-[16px] rounded-tl-sm border px-4 py-3 ${
          post.isFlagged ? "border-[#fecaca] bg-[#fffafa]" : "border-[#eef1f5] bg-white"
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[14px]" style={{ color: authorColor }}>
                {post.author.name ?? 'Anonymous'}
              </span>
              <span className="text-[12px] text-[#94a3b8]">{post.author.email}</span>
              {post.channel && (
                <span className="rounded-full bg-[#f0f9ff] px-2 py-0.5 text-[11px] font-semibold text-[#0369a1]">
                  #{post.channel.name}
                </span>
              )}
              {post.isFlagged && (
                <StatusBadge tone="critical" icon={TriangleAlert}>Flagged</StatusBadge>
              )}
            </div>

            <div className="flex gap-2">
              {post.isFlagged && (
                <button type="button" onClick={() => onUnflag(post.id)} className={adminButtonSm.secondary}>
                  Approve
                </button>
              )}
              <button type="button" onClick={() => onDelete(post.id)} disabled={deletingId === post.id} className={adminButtonSm.destructive}>
                {deletingId === post.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          <h4 className="mb-1 text-[15px] font-semibold text-[#0f172a]">{post.title}</h4>
          
          {post.body && (
            <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#334155]">
              {post.body}
            </p>
          )}

          {post.flagReason && (
            <div className="mt-3 flex items-start gap-2 rounded-[10px] border border-[#fee2e2] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <span className="font-semibold">Flag reason:</span> {post.flagReason}
              </div>
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 border-t border-[#f1f5f9] pt-2 text-[11px] text-[#94a3b8]">
            <span>{new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" /> {post._count.likes}</span>
            <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {post._count.replies}</span>
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
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-10">
        <RevealSection>
          <AdminPageHeader
            eyebrow="Safety"
            icon={ShieldAlert}
            title="Content moderation"
            description="Review flagged community posts and overdue evaluations to keep the platform safe."
          />
        </RevealSection>

        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard index={0} title="Total posts" value={loading ? "…" : totalPosts} caption="Community posts." icon={<MessageSquareText />} tone="sky" />
          <AdminStatCard index={1} title="Flagged" value={loading ? "…" : flagged.length} caption="Awaiting review." icon={<TriangleAlert />} tone="amber" />
          <AdminStatCard index={2} title="Flag rate" value={loading ? "…" : totalPosts > 0 ? `${((flagged.length / totalPosts) * 100).toFixed(1)}%` : "0%"} caption="Of all posts." icon={<Percent />} tone="slate" />
          <AdminStatCard index={3} title="Overdue reviews" value={loading ? "…" : overdueReviews.length} caption="Past the 24-hour review window." icon={<Siren />} tone="rose" />
        </StaggerGrid>

        {overdueReviews.length > 0 && (
          <AdminPanel>
            <AdminPanelHeader
              icon={Siren}
              tone="rose"
              title="Overdue sketch evaluations"
              description="Teachers haven't evaluated these sketch questions for over 24 hours"
              actions={<StatusBadge tone="critical">{overdueReviews.length} overdue</StatusBadge>}
            />
            <div className="mt-5 space-y-3">
              {overdueReviews.map((review) => {
                const hoursOverdue = Math.floor((Date.now() - new Date(review.submittedAt).getTime()) / (1000 * 60 * 60));
                return (
                  <div key={review.attemptId} className={`${adminRowClass} flex items-center justify-between gap-4`}>
                    <div className="min-w-0">
                      <h4 className="truncate text-[14px] font-semibold text-[#0f172a]">{review.examTitle}</h4>
                      <p className="mt-0.5 text-[12px] text-[#64748b]">
                        {review.courseTitle} · {review.studentName}
                      </p>
                      <p className="mt-1.5 text-[12px] text-[#94a3b8]">
                        Assigned: {review.assignedTeachers.length > 0 ? review.assignedTeachers.join(", ") : "Nobody"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[20px] font-semibold tabular-nums text-[#b91c1c]">{hoursOverdue}h</div>
                      <div className="text-[11px] text-[#94a3b8]">overdue</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminPanel>
        )}

        <AdminPanel>
          <AdminPanelHeader icon={TriangleAlert} tone="amber" title="Flagged posts" description="Approve to keep a post, or delete it" />
          <div className="mt-5 space-y-1">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="mb-3 h-28 animate-pulse rounded-[16px] bg-[#f1f5f9]" />)
            ) : flagged.length === 0 ? (
              <AdminEmptyState icon={CircleCheck} title="No flagged posts" description="The community is clean. No reports to review." />
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
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader
            icon={MessageSquareText}
            tone="sky"
            title="All community posts"
            description="Delete any community post from here, whether it has been flagged or not"
          />
          <div className="mt-5 space-y-1">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="mb-3 h-28 animate-pulse rounded-[16px] bg-[#f1f5f9]" />)
            ) : posts.length === 0 ? (
              <AdminEmptyState
                icon={MessageSquareText}
                title="No community posts yet"
                description="Posts will appear here once learners or mentors start publishing."
              />
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
        </AdminPanel>
      </div>
    </PageTransition>
  );
}
