"use client";

import { m as motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  CornerUpLeft,
  Globe,
  Hash,
  MessageCircle,
  Paperclip,
  Pencil,
  SendHorizontal,
  ThumbsUp,
  TriangleAlert,
  X,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { COMMUNITY_POST_XP_COST } from "@/lib/xp-costs";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { usePolling } from "@/hooks/use-polling";
import { PageTransition } from "../_components/motion-wrappers";

type Post = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; role?: string };
  channel: { id: string; name: string } | null;
  replyCount: number;
  likeCount: number;
  likedByMe: boolean;
  replyTo?: {
    id: string;
    title: string;
    body: string;
    author: { id: string; name: string | null } | null;
  } | null;
};

type Channel = { id: string; name: string; postCount: number };

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null; role?: string };
};

// Brand blue darkened just enough to pass AA as small text
const brandInk = "text-[color-mix(in_srgb,var(--brand-primary-strong)_72%,black)]";
const card = "rounded-[24px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]";
const sendButton =
  "grid shrink-0 place-items-center rounded-[16px] bg-(--brand-primary-strong) text-white shadow-[0_4px_12px_rgba(32,155,210,0.28)] transition-[filter,background-color,box-shadow] duration-150 hover:brightness-95 disabled:bg-black/[0.08] disabled:text-black/30 disabled:shadow-none";
const iconButton =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black disabled:opacity-50";
// Applied for a moment to the message a quote points at
const highlightClass = "bg-[rgba(254,198,0,0.22)]";
const STAFF_ROLES = new Set(["TEACHER", "MENTOR", "ADMIN", "SUPER_ADMIN"]);
const CHANNELS_REFRESH_MS = 60_000;

const clockFormatter = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
const fullFormatter = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" });
const dayFormatter = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short" });

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return dayFormatter.format(date);
}

function staffLabel(role?: string) {
  if (!role || !STAFF_ROLES.has(role)) return null;
  return role === "TEACHER" || role === "MENTOR" ? "Teacher" : "Admin";
}

// Replies get an automatic "Re: …" subject; the quote already shows that context
function visibleTitle(post: Post) {
  return post.replyTo && /^Re:\s/i.test(post.title) ? null : post.title;
}

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Avatar({ name, image, className }: { name: string | null; image: string | null; className: string }) {
  if (image) {
    // User photos come from arbitrary hosts, so they skip next/image
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className={cx("shrink-0 rounded-full object-cover", className)} />;
  }
  return <InitialsAvatar name={name} className={className} />;
}

function StaffBadge({ role }: { role?: string }) {
  const label = staffLabel(role);
  if (!label) return null;
  return (
    <span className="rounded-full bg-[rgba(254,198,0,0.22)] px-2 py-0.5 text-[11px] font-semibold text-[#6b4c00]">
      {label}
    </span>
  );
}

function ChannelButton({
  active,
  icon,
  meta,
  name,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  meta: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cx(
        "flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors",
        active ? "bg-(--brand-primary-soft)" : "hover:bg-black/[0.03]",
      )}
    >
      <span
        className={cx(
          "grid h-10 w-10 shrink-0 place-items-center rounded-[14px] transition-colors",
          active ? "bg-(--brand-primary-strong) text-white" : "bg-[#eef7fc] text-(--brand-primary-strong)",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={cx("block truncate text-[14px] font-semibold capitalize", active ? brandInk : "text-black")}>
          {name}
        </span>
        <span className="block text-[12px] text-black/50">{meta}</span>
      </span>
    </button>
  );
}

function ChannelChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cx(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 transition-colors",
        active ? "bg-(--brand-primary-strong) text-white" : "bg-black/[0.04] text-black/70 hover:bg-black/[0.07]",
      )}
    >
      <span className="text-[13px] font-semibold capitalize">{label}</span>
    </button>
  );
}

function DaySeparator({ label }: { label: string }) {
  return (
    <div role="separator" className="my-5 flex items-center gap-3 first:mt-1">
      <span className="h-px flex-1 bg-black/[0.06]" />
      <span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-black/55 shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
        {label}
      </span>
      <span className="h-px flex-1 bg-black/[0.06]" />
    </div>
  );
}

// ─── Message ──────────────────────────────────────────────────────────────────

function Message({
  post,
  index,
  isOwnPost,
  showChannel,
  copied,
  onToggleLike,
  onOpenPost,
  onReply,
  onEdit,
  onCopy,
  onJumpTo,
}: {
  post: Post;
  index: number;
  isOwnPost: boolean;
  showChannel: boolean;
  copied: boolean;
  onToggleLike: (postId: string) => void;
  onOpenPost: (post: Post) => void;
  onReply: (post: Post) => void;
  onEdit: (post: Post) => void;
  onCopy: (post: Post) => void;
  onJumpTo: (postId: string) => void;
}) {
  const created = new Date(post.createdAt);
  const title = visibleTitle(post);
  const authorName = post.author.name ?? "Anonymous";
  // Reply, copy and edit appear on hover with a mouse, and stay visible on touch screens
  const revealOnHover =
    "opacity-0 transition-opacity group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 pointer-coarse:opacity-100";
  const footerButton =
    "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-black/55 transition-colors hover:bg-black/[0.05] hover:text-black";

  return (
    <motion.div
      id={`msg-${post.id}`}
      className={cx("group/msg flex gap-3 rounded-[20px] px-1 py-2 transition-colors duration-500", isOwnPost && "flex-row-reverse")}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.2) }}
    >
      {!isOwnPost && (
        <button type="button" onClick={() => onOpenPost(post)} aria-label={`Open ${authorName}'s post`} className="mt-6 self-start">
          <Avatar name={post.author.name} image={post.author.image} className="h-9 w-9 text-[12px]" />
        </button>
      )}

      <div className={cx("flex min-w-0 max-w-[88%] flex-col sm:max-w-[74%] lg:max-w-[64%]", isOwnPost && "items-end")}>
        <div className={cx("mb-1 flex items-center gap-2 px-1", isOwnPost && "flex-row-reverse")}>
          {!isOwnPost && <span className="text-[13px] font-semibold text-black">{authorName}</span>}
          {!isOwnPost && <StaffBadge role={post.author.role} />}
          <time dateTime={post.createdAt} title={fullFormatter.format(created)} className="text-[12px] text-black/45">
            {clockFormatter.format(created)}
          </time>
        </div>

        <div
          onClick={() => onOpenPost(post)}
          className={cx(
            "w-full cursor-pointer rounded-[20px] px-4 py-3 text-left transition-shadow duration-200 hover:shadow-[0_6px_18px_rgba(15,23,42,0.08)]",
            isOwnPost
              ? "rounded-tr-[6px] bg-[#e4f6ff] shadow-[0_2px_8px_rgba(32,155,210,0.08)] ring-1 ring-[rgba(56,193,255,0.28)]"
              : "rounded-tl-[6px] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.05]",
          )}
        >
          {post.replyTo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onJumpTo(post.replyTo!.id);
              }}
              className="mb-2.5 flex w-full items-start gap-2 rounded-[12px] bg-black/[0.04] px-3 py-2 text-left transition-colors hover:bg-black/[0.07]"
            >
              <CornerUpLeft aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-black/40" />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-black/75">
                  {post.replyTo.author?.name ?? "Anonymous"}
                </span>
                <span className="block truncate text-[12px] text-black/55">
                  {post.replyTo.title || post.replyTo.body}
                </span>
              </span>
            </button>
          )}

          {showChannel && post.channel && (
            <span
              className={cx(
                "mb-1.5 inline-flex items-center gap-0.5 rounded-full bg-(--brand-primary-soft) px-2 py-0.5 text-[11px] font-semibold capitalize",
                brandInk,
              )}
            >
              <Hash aria-hidden="true" className="h-3 w-3" />
              {post.channel.name}
            </span>
          )}

          {title && <h3 className="text-[15px] font-semibold leading-snug text-black">{title}</h3>}
          {post.body && (
            <p className={cx("whitespace-pre-wrap break-words text-[14px] leading-relaxed text-black/75", title && "mt-1")}>
              {post.body}
            </p>
          )}
          {post.imageUrl && (
            <div className="mt-3 overflow-hidden rounded-[14px] bg-black/[0.03] ring-1 ring-black/[0.05]">
              {/* eslint-disable-next-line @next/next/no-img-element -- uploaded images live on external storage */}
              <img src={post.imageUrl} alt="" className="max-h-[260px] w-full object-cover" />
            </div>
          )}
        </div>

        <div className={cx("mt-1.5 flex flex-wrap items-center gap-1 px-0.5", isOwnPost && "justify-end")}>
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            aria-pressed={post.likedByMe}
            aria-label={`${post.likedByMe ? "Unlike" : "Like"} (${post.likeCount})`}
            className={cx(
              footerButton,
              post.likedByMe && "bg-[rgba(254,198,0,0.22)] text-[#6b4c00] hover:bg-[rgba(254,198,0,0.32)] hover:text-[#6b4c00]",
            )}
          >
            <ThumbsUp aria-hidden="true" className={cx("h-3.5 w-3.5", post.likedByMe && "fill-current")} />
            <span className="text-[12px] font-semibold tabular-nums">{post.likeCount}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenPost(post)}
            aria-label={`Open comments (${post.replyCount})`}
            className={footerButton}
          >
            <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="text-[12px] font-semibold tabular-nums">{post.replyCount}</span>
          </button>
          <span className={cx("flex items-center gap-1", revealOnHover)}>
            <button type="button" onClick={() => onReply(post)} className={footerButton}>
              <CornerUpLeft aria-hidden="true" className="h-3.5 w-3.5" />
              <span className="text-[12px] font-semibold">Reply</span>
            </button>
            <button
              type="button"
              onClick={() => onCopy(post)}
              className={cx(footerButton, copied && "text-(--status-success)")}
            >
              {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
              <span className="text-[12px] font-semibold">{copied ? "Copied" : "Copy"}</span>
            </button>
            {isOwnPost && (
              <button type="button" onClick={() => onEdit(post)} className={footerButton}>
                <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                <span className="text-[12px] font-semibold">Edit</span>
              </button>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function FeedSkeleton() {
  return (
    <div role="status" className="space-y-6 py-2">
      <span className="sr-only">Loading messages</span>
      {[false, false, true, false].map((own, i) => (
        <div key={i} className={cx("flex gap-3", own && "flex-row-reverse")}>
          {!own && <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />}
          <div className={cx("w-[min(26rem,70%)] space-y-2", own && "flex flex-col items-end")}>
            <div className="h-3 w-24 animate-pulse rounded bg-black/[0.06]" />
            <div className="h-20 w-full animate-pulse rounded-[20px] bg-white ring-1 ring-black/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardCommunityPage() {
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string | null;
    role: string;
  } | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // Form input states
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");
  const [selectedImageUrl, setSelectedImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Interactive UI states
  const [replyingToPost, setReplyingToPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [unseenCount, setUnseenCount] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // Comments states
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const inflightLikesRef = useRef<Set<string>>(new Set());
  const selectedChannelRef = useRef<string | null>(null);
  const newestPostIdRef = useRef<string | null>(null);
  const nearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const channelsFetchedAtRef = useRef(0);

  // Fetch comments when selectedPost changes
  useEffect(() => {
    if (selectedPost) {
      setLoadingComments(true);
      fetch(`/api/community/posts/${selectedPost.id}/replies`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setComments(json.data);
          }
        })
        .catch((err) => console.error("Error fetching comments:", err))
        .finally(() => setLoadingComments(false));
    } else {
      setComments([]);
      setNewComment("");
    }
  }, [selectedPost?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch per post, not on like/count updates

  // Close the post dialog with Escape
  useEffect(() => {
    if (!selectedPost) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedPost(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPost]);

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    const commentBody = newComment.trim();

    try {
      const res = await fetch(`/api/community/posts/${selectedPost.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const newReply = json.data;
        setComments((prev) => [...prev, newReply]);
        setNewComment("");

        // Optimistically increment selectedPost replyCount
        setSelectedPost((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1 } : null));

        // Optimistically increment the post in feed list
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p.id === selectedPost.id ? { ...p, replyCount: p.replyCount + 1 } : p)),
        );
      }
    } catch (err) {
      console.error("Error creating comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Fetch current user details
  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCurrentUser(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Scrolls the feed itself; scrollIntoView would also scroll the whole page
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const feed = feedContainerRef.current;
    if (feed) feed.scrollTo({ top: feed.scrollHeight, behavior });
    setUnseenCount(0);
  }, []);

  const handleFeedScroll = () => {
    const feed = feedContainerRef.current;
    if (!feed) return;
    nearBottomRef.current = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 120;
    if (nearBottomRef.current) setUnseenCount(0);
  };

  const loadPosts = useCallback(async (): Promise<boolean> => {
    const chanId = selectedChannelRef.current;
    const params = new URLSearchParams();
    if (chanId) params.set("channelId", chanId);
    // The channel list and its post counts only refresh once a minute
    const refreshChannels = Date.now() - channelsFetchedAtRef.current > CHANNELS_REFRESH_MS;
    if (!refreshChannels) params.set("channels", "0");

    try {
      const json = await fetch(`/api/community/posts?${params}`).then((r) => r.json());
      // Ignore a response for a channel the student has already left
      if (!json.success || chanId !== selectedChannelRef.current) return false;
      const nextPosts: Post[] = json.data.posts;
      if (json.data.channels) {
        setChannels(json.data.channels);
        channelsFetchedAtRef.current = Date.now();
      }

      // Posts arrive newest first, one page at a time. Older posts the student
      // loaded stay below the fresh page as long as the two overlap; if more new
      // posts arrived than fit on a page, start over from the fresh page instead
      // of leaving a silent gap.
      const previousNewest = newestPostIdRef.current;
      const newest = nextPosts[0]?.id ?? null;
      newestPostIdRef.current = newest;
      const seenIndex = previousNewest ? nextPosts.findIndex((p) => p.id === previousNewest) : -1;
      const keepOlder = seenIndex !== -1;
      setPosts((prev) => {
        const fresh = nextPosts.map((newPost) => {
          if (inflightLikesRef.current.has(newPost.id)) {
            const existing = prev.find((p) => p.id === newPost.id);
            if (existing) {
              return { ...newPost, likedByMe: existing.likedByMe, likeCount: existing.likeCount };
            }
          }
          return newPost;
        });
        if (!keepOlder) return fresh;
        const freshIds = new Set(fresh.map((p) => p.id));
        return [...fresh, ...prev.filter((p) => !freshIds.has(p.id))];
      });
      if (!keepOlder) setHasOlder(Boolean(json.data.nextCursor));

      // Follow new messages only when the reader is already at the bottom (or
      // just sent one); otherwise count them for the "new messages" button. The
      // just-sent flag only applies to this load.
      const justSent = forceScrollRef.current;
      forceScrollRef.current = false;
      if (!newest || newest === previousNewest) return false;
      if (seenIndex === -1 || justSent || nearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(seenIndex === -1 ? "auto" : "smooth"));
      } else {
        setUnseenCount((count) => count + seenIndex);
      }
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [scrollToBottom]);

  // New messages every 5s while they keep coming, easing off to 30s when the
  // channel is quiet; nothing at all while the tab is in the background
  usePolling(loadPosts, { intervalMs: 5000, maxIntervalMs: 30_000, resetKey: selectedChannelId });

  const loadOlder = async () => {
    const oldest = posts[posts.length - 1];
    if (!oldest || loadingOlder) return;
    const chanId = selectedChannelRef.current;
    const feed = feedContainerRef.current;
    const previousHeight = feed?.scrollHeight ?? 0;
    setLoadingOlder(true);
    try {
      const params = new URLSearchParams({ cursor: oldest.id, channels: "0" });
      if (chanId) params.set("channelId", chanId);
      const json = await fetch(`/api/community/posts?${params}`).then((r) => r.json());
      if (!json.success || chanId !== selectedChannelRef.current) return;
      const older: Post[] = json.data.posts;
      setPosts((prev) => {
        const known = new Set(prev.map((p) => p.id));
        return [...prev, ...older.filter((p) => !known.has(p.id))];
      });
      setHasOlder(Boolean(json.data.nextCursor));
      // Older posts are added above what the student is reading; keep their place
      requestAnimationFrame(() => {
        if (feed) feed.scrollTop += feed.scrollHeight - previousHeight;
      });
    } catch {
      // The button stays, so the student can try again
    } finally {
      setLoadingOlder(false);
    }
  };

  const selectChannel = (channelId: string | null) => {
    if (channelId === selectedChannelRef.current) return;
    selectedChannelRef.current = channelId;
    newestPostIdRef.current = null;
    setUnseenCount(0);
    setPosts([]);
    setHasOlder(false);
    setLoading(true);
    setSelectedChannelId(channelId);
  };

  const jumpToPost = (postId: string) => {
    const feed = feedContainerRef.current;
    const element = document.getElementById(`msg-${postId}`);
    if (!feed || !element) return;
    feed.scrollTo({ top: element.offsetTop - feed.clientHeight / 3, behavior: "smooth" });
    element.classList.add(highlightClass);
    setTimeout(() => element.classList.remove(highlightClass), 1500);
  };

  const resetComposer = () => {
    setNewPostTitle("");
    setNewPostBody("");
    setSelectedImageUrl("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data?.url) {
        setFormError(payload?.error || "Failed to upload the image.");
        return;
      }

      setSelectedImageUrl(payload.data.url as string);
    } catch {
      setFormError("Failed to upload the image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    const trimmedTitle = newPostTitle.trim();
    const trimmedBody = newPostBody.trim();

    if (!trimmedTitle) {
      setFormError("Subject is required");
      return;
    }
    if (!trimmedBody && !selectedImageUrl) {
      setFormError("Message body or image is required");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      if (editingPost) {
        // Handle post content updates
        const res = await fetch(`/api/community/posts/${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            body: trimmedBody,
            imageUrl: selectedImageUrl || null,
          }),
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success !== false) {
          resetComposer();
          setEditingPost(null);
          loadPosts();
          return;
        }
        setFormError(json?.error || json?.message || "Failed to update message.");
      } else {
        // Handle new posts
        const res = await fetch("/api/community/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            postBody: trimmedBody,
            imageUrl: selectedImageUrl || undefined,
            channelId: selectedChannelId || undefined,
            replyToId: replyingToPost?.id || undefined,
          }),
        });
        const json = await res.json().catch(() => null);

        if (res.ok && json?.success !== false) {
          resetComposer();
          setReplyingToPost(null);
          forceScrollRef.current = true;
          loadPosts();
          return;
        }
        setFormError(json?.error || json?.message || "Could not create your message right now.");
      }
    } catch {
      setFormError("Could not transmit your message. Connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    inflightLikesRef.current.add(postId);
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = p.likedByMe;
          return {
            ...p,
            likedByMe: !isLiked,
            likeCount: p.likeCount + (isLiked ? -1 : 1),
          };
        }
        return p;
      }),
    );

    try {
      await fetch(`/api/community/posts/${postId}/like`, { method: "POST" });
    } catch {
      loadPosts(); // Revert
    } finally {
      setTimeout(() => inflightLikesRef.current.delete(postId), 2000);
    }
  };

  const handleCopy = (post: Post) => {
    const textToCopy = post.body;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedPostId(post.id);
      setTimeout(() => setCopiedPostId(null), 2000);
    });
  };

  const handleReplySetup = (post: Post) => {
    setReplyingToPost(post);
    setEditingPost(null);
    if (!newPostTitle) {
      setNewPostTitle(`Re: ${post.title.replace(/^Re:\s*/, "")}`);
    }
    textareaRef.current?.focus();
  };

  const handleEditSetup = (post: Post) => {
    setEditingPost(post);
    setReplyingToPost(null);
    setNewPostTitle(post.title);
    setNewPostBody(post.body);
    setSelectedImageUrl(post.imageUrl || "");
    textareaRef.current?.focus();
  };

  const handleCancelInputMode = () => {
    setReplyingToPost(null);
    setEditingPost(null);
    resetComposer();
  };

  const activeChannel = selectedChannelId ? channels.find((c) => c.id === selectedChannelId) : null;
  const activeChannelName = activeChannel?.name ?? "All posts";
  const isStudent = currentUser?.role === "STUDENT";
  const canSend =
    !submitting && !uploadingImage && Boolean(newPostTitle.trim()) && Boolean(newPostBody.trim() || selectedImageUrl);

  // Oldest at the top, newest at the bottom, grouped under a separator per day
  const days = useMemo(() => {
    const groups: { key: string; label: string; posts: Post[] }[] = [];
    for (const post of [...posts].reverse()) {
      const created = new Date(post.createdAt);
      const key = dayKey(created);
      const last = groups[groups.length - 1];
      if (last?.key === key) last.posts.push(post);
      else groups.push({ key, label: dayLabel(created), posts: [post] });
    }
    return groups;
  }, [posts]);

  let messageIndex = 0;

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-24 text-black sm:bg-[#f7f5f4] sm:pb-0">
      <PageTransition>
        <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px] xl:pr-10">
          <div className="mx-auto flex h-[calc(100dvh-var(--app-header-height)-7.5rem)] min-h-[540px] max-w-[1400px] gap-5 lg:h-[calc(100dvh-var(--app-header-height)-2.5rem)]">
            {/* Left: intro and channels */}
            <aside className="hidden w-[300px] shrink-0 flex-col gap-4 xl:flex">
              <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#38c1ff_0%,#00a7fa_100%)] p-6 text-white shadow-[0_12px_32px_rgba(56,193,255,0.25)]">
                <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
                <h1 className="relative text-[1.75rem] font-bold leading-tight tracking-[-0.03em]">Community</h1>
                <p className="relative mt-2 text-[14px] leading-relaxed text-white/92">
                  Ask doubts, share notes, and learn together with your batch.
                </p>
              </div>

              <nav aria-label="Channels" className={cx(card, "flex min-h-0 flex-1 flex-col p-3")}>
                <p className="px-3 pb-2 pt-1 text-[13px] font-semibold text-black/50">Channels</p>
                <div className="scrollbar-none min-h-0 flex-1 space-y-1 overflow-y-auto">
                  <ChannelButton
                    active={selectedChannelId === null}
                    icon={<Globe aria-hidden="true" className="h-[18px] w-[18px]" />}
                    meta="Every channel in one feed"
                    name="All posts"
                    onClick={() => selectChannel(null)}
                  />
                  {channels.map((ch) => (
                    <ChannelButton
                      key={ch.id}
                      active={selectedChannelId === ch.id}
                      icon={<Hash aria-hidden="true" className="h-[18px] w-[18px]" />}
                      meta={`${ch.postCount} ${ch.postCount === 1 ? "post" : "posts"}`}
                      name={ch.name}
                      onClick={() => selectChannel(ch.id)}
                    />
                  ))}
                  {!loading && channels.length === 0 && (
                    <p className="px-3 py-2 text-[13px] text-black/45">No channels yet.</p>
                  )}
                </div>
              </nav>
            </aside>

            {/* Right: conversation */}
            <div className={cx(card, "flex min-w-0 flex-1 flex-col overflow-hidden")}>
              <header className="border-b border-black/[0.05] px-4 py-3.5 sm:px-6 sm:py-4">
                <h1 className="sr-only xl:hidden">Community</h1>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-(--brand-primary-strong) text-white">
                    {activeChannel ? (
                      <Hash aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      <Globe aria-hidden="true" className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-bold capitalize text-black">{activeChannelName}</h2>
                    <p className="text-[12px] text-black/50">
                      {activeChannel
                        ? `${activeChannel.postCount} ${activeChannel.postCount === 1 ? "post" : "posts"}`
                        : "Every channel, newest at the bottom"}
                    </p>
                  </div>
                </div>
                {channels.length > 0 && (
                  <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 xl:hidden">
                    <ChannelChip active={selectedChannelId === null} label="All posts" onClick={() => selectChannel(null)} />
                    {channels.map((ch) => (
                      <ChannelChip
                        key={ch.id}
                        active={selectedChannelId === ch.id}
                        label={`# ${ch.name}`}
                        onClick={() => selectChannel(ch.id)}
                      />
                    ))}
                  </div>
                )}
              </header>

              <div className="relative min-h-0 flex-1">
                <div
                  ref={feedContainerRef}
                  onScroll={handleFeedScroll}
                  className="relative h-full overflow-y-auto bg-[#f6f9fc] bg-[radial-gradient(rgba(56,193,255,0.14)_1px,transparent_1px)] bg-size-[20px_20px] px-3 py-4 sm:px-6"
                >
                  {loading ? (
                    <FeedSkeleton />
                  ) : posts.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                      <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-white text-(--brand-primary-strong) shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]">
                        <MessageCircle aria-hidden="true" className="h-7 w-7" />
                      </span>
                      <p className="mt-4 text-[17px] font-bold text-black">Start the conversation</p>
                      <p className="mt-1.5 max-w-[38ch] text-[14px] leading-relaxed text-black/55">
                        {activeChannel ? `Nothing in #${activeChannel.name} yet.` : "Nothing posted yet."} Ask a doubt or
                        share something useful with your batch.
                      </p>
                    </div>
                  ) : (
                    <>
                    {hasOlder && (
                      <div className="flex justify-center pb-1">
                        <button
                          type="button"
                          onClick={loadOlder}
                          disabled={loadingOlder}
                          className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-black/70 shadow-[0_1px_4px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.06] transition-colors hover:text-black disabled:opacity-60"
                        >
                          {loadingOlder ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-transparent" />
                          ) : (
                            <ArrowUp aria-hidden="true" className="h-4 w-4" />
                          )}
                          <span className="text-[13px] font-semibold">{loadingOlder ? "Loading…" : "Load older messages"}</span>
                        </button>
                      </div>
                    )}
                    {days.map((day) => (
                      <div key={day.key}>
                        <DaySeparator label={day.label} />
                        {day.posts.map((post) => (
                          <Message
                            key={post.id}
                            post={post}
                            index={messageIndex++}
                            isOwnPost={Boolean(currentUser && post.author.id === currentUser.id)}
                            showChannel={selectedChannelId === null}
                            copied={copiedPostId === post.id}
                            onToggleLike={handleToggleLike}
                            onOpenPost={setSelectedPost}
                            onReply={handleReplySetup}
                            onEdit={handleEditSetup}
                            onCopy={handleCopy}
                            onJumpTo={jumpToPost}
                          />
                        ))}
                      </div>
                    ))}
                    </>
                  )}
                </div>

                {unseenCount > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom()}
                    className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-(--brand-primary-strong) px-4 py-2 text-white shadow-[0_8px_20px_rgba(32,155,210,0.35)] transition hover:brightness-95"
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    <span className="text-[13px] font-semibold">
                      {unseenCount} new {unseenCount === 1 ? "message" : "messages"}
                    </span>
                  </button>
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-black/[0.05] bg-white px-3 py-3 sm:px-5 sm:py-4">
                {(replyingToPost || editingPost) && (
                  <div className="mb-2.5 flex items-center gap-3 rounded-[14px] bg-(--brand-primary-soft) px-3 py-2">
                    {replyingToPost ? (
                      <CornerUpLeft aria-hidden="true" className={cx("h-4 w-4 shrink-0", brandInk)} />
                    ) : (
                      <Pencil aria-hidden="true" className={cx("h-4 w-4 shrink-0", brandInk)} />
                    )}
                    <div className="min-w-0 flex-1 text-[12px]">
                      <p className={cx("font-semibold", brandInk)}>
                        {replyingToPost
                          ? `Replying to ${replyingToPost.author.name ?? "Anonymous"}`
                          : "Editing your message"}
                      </p>
                      <p className="truncate text-black/60">
                        {replyingToPost
                          ? replyingToPost.title || replyingToPost.body
                          : editingPost?.title || editingPost?.body}
                      </p>
                    </div>
                    <button type="button" onClick={handleCancelInputMode} className={cx(iconButton, "h-7 w-7")} aria-label="Cancel">
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {formError && (
                  <p
                    role="alert"
                    className="mb-2.5 flex items-center gap-1.5 rounded-[12px] bg-[rgba(255,61,0,0.08)] px-3 py-2 text-[13px] font-medium text-[#b42d00]"
                  >
                    <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" />
                    {formError}
                  </p>
                )}

                {selectedImageUrl && (
                  <div className="relative mb-2.5 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- just-uploaded image on external storage */}
                    <img
                      src={selectedImageUrl}
                      alt="Attachment preview"
                      className="h-16 w-16 rounded-[12px] object-cover ring-1 ring-black/10"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImageUrl("")}
                      className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-black/75 text-white shadow-sm transition-colors hover:bg-black"
                      aria-label="Remove image"
                    >
                      <X aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[20px] bg-[#f4f6f9] px-2 py-1.5 ring-1 ring-black/[0.04] transition focus-within:bg-white focus-within:ring-[rgba(56,193,255,0.55)]">
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className={cx(iconButton, "mb-0.5")}
                      aria-label="Attach image"
                      title="Attach image"
                    >
                      {uploadingImage ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-transparent" />
                      ) : (
                        <Paperclip aria-hidden="true" className="h-[18px] w-[18px]" />
                      )}
                    </button>
                    <input ref={fileInputRef} accept="image/*" className="hidden" type="file" onChange={handleFileSelect} />

                    <div className="min-w-0 flex-1 py-0.5">
                      <input
                        aria-label="Subject"
                        placeholder="Subject"
                        className="w-full bg-transparent px-2 py-1 text-[13px] font-semibold text-black outline-none placeholder:font-medium placeholder:text-black/40"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                      />
                      <textarea
                        ref={textareaRef}
                        aria-label="Message"
                        className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent px-2 py-1 text-[14px] leading-normal text-black outline-none placeholder:text-black/40"
                        placeholder="Write a message…"
                        rows={1}
                        value={newPostBody}
                        onChange={(e) => {
                          setNewPostBody(e.target.value);
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSend) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className={cx(sendButton, "h-12 w-12")}
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label={editingPost ? "Save changes" : "Send message"}
                  >
                    {submitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                    ) : editingPost ? (
                      <Check aria-hidden="true" className="h-5 w-5 stroke-[2.5]" />
                    ) : (
                      <SendHorizontal aria-hidden="true" className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="mt-2 px-1 text-[12px] text-black/45">
                  {editingPost
                    ? "Saving updates your existing message"
                    : activeChannel
                      ? `Posting in #${activeChannel.name}`
                      : "Posting to the general feed"}
                  {isStudent && !editingPost && ` · Costs ${COMMUNITY_POST_XP_COST} XP`}
                  <span className="hidden sm:inline"> · ⌘/Ctrl + Enter to send</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageTransition>

      {/* Post detail dialog */}
      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-dialog-title"
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPost(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex max-h-[90dvh] w-full max-w-[680px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.24)] sm:rounded-[24px]"
          >
            <header className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-4 sm:px-7">
              <Avatar name={selectedPost.author.name} image={selectedPost.author.image} className="h-11 w-11 text-[14px]" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-black">
                  <span className="truncate">{selectedPost.author.name ?? "Anonymous"}</span>
                  <StaffBadge role={selectedPost.author.role} />
                </p>
                <p className="text-[12px] text-black/50">
                  <span title={fullFormatter.format(new Date(selectedPost.createdAt))}>{timeAgo(selectedPost.createdAt)}</span>
                  {selectedPost.channel && <span className="capitalize"> · #{selectedPost.channel.name}</span>}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedPost(null)} className={iconButton} aria-label="Close">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <h2 id="post-dialog-title" className="text-[20px] font-bold leading-snug tracking-[-0.01em] text-black">
                {selectedPost.title}
              </h2>
              {selectedPost.body ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-black/75">
                  {selectedPost.body}
                </p>
              ) : null}
              {selectedPost.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded images live on external storage
                <img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.title}
                  className="mt-4 h-auto max-h-[360px] w-full rounded-[16px] bg-black/[0.03] object-contain ring-1 ring-black/[0.05]"
                />
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={selectedPost.likedByMe}
                  className={cx(
                    "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 transition-colors",
                    selectedPost.likedByMe
                      ? "bg-[rgba(254,198,0,0.22)] text-[#6b4c00]"
                      : "bg-black/[0.04] text-black/65 hover:bg-black/[0.07]",
                  )}
                  onClick={() => {
                    handleToggleLike(selectedPost.id);
                    setSelectedPost((prev) =>
                      prev
                        ? {
                            ...prev,
                            likedByMe: !prev.likedByMe,
                            likeCount: prev.likeCount + (prev.likedByMe ? -1 : 1),
                          }
                        : null,
                    );
                  }}
                >
                  <ThumbsUp aria-hidden="true" className={cx("h-4 w-4", selectedPost.likedByMe && "fill-current")} />
                  <span className="text-[13px] font-semibold tabular-nums">
                    {selectedPost.likeCount} {selectedPost.likeCount === 1 ? "like" : "likes"}
                  </span>
                </button>
                <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-semibold text-black/55">
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  <span className="tabular-nums">
                    {selectedPost.replyCount} {selectedPost.replyCount === 1 ? "comment" : "comments"}
                  </span>
                </span>
              </div>

              <section aria-labelledby="comments-heading" className="mt-6 border-t border-black/[0.05] pt-5">
                <h3 id="comments-heading" className="text-[15px] font-bold text-black">
                  Comments
                </h3>

                {loadingComments ? (
                  <div role="status" className="mt-4 space-y-3">
                    <span className="sr-only">Loading comments</span>
                    {[0, 1].map((i) => (
                      <div key={i} className="flex gap-3">
                        <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-black/[0.06]" />
                        <div className="h-14 flex-1 animate-pulse rounded-[16px] bg-black/[0.04]" />
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <p className="mt-3 rounded-[16px] bg-[#f6f9fc] px-4 py-5 text-center text-[13px] text-black/50">
                    No comments yet. Be the first to reply.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {comments.map((comment) => (
                      <li key={comment.id} className="flex items-start gap-3">
                        <Avatar name={comment.author.name} image={comment.author.image} className="mt-0.5 h-8 w-8 text-[11px]" />
                        <div className="min-w-0 flex-1 rounded-[16px] rounded-tl-[6px] bg-[#f6f9fc] px-3.5 py-2.5">
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate text-[13px] font-semibold text-black">
                                {comment.author.name ?? "Anonymous"}
                              </span>
                              <StaffBadge role={comment.author.role} />
                            </span>
                            <span
                              className="shrink-0 text-[11px] text-black/45"
                              title={fullFormatter.format(new Date(comment.createdAt))}
                            >
                              {timeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-black/75">
                            {comment.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <form onSubmit={handleCreateComment} className="flex items-center gap-2 border-t border-black/[0.05] px-5 py-3 sm:px-7">
              <input
                type="text"
                aria-label="Write a comment"
                placeholder="Write a comment…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={submittingComment}
                className="h-11 min-w-0 flex-1 rounded-[14px] bg-[#f4f6f9] px-4 text-[14px] text-black outline-none ring-1 ring-black/[0.04] transition placeholder:text-black/40 focus:bg-white focus:ring-[rgba(56,193,255,0.55)]"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className={cx(sendButton, "h-11 w-11 rounded-[14px]")}
                aria-label="Post comment"
              >
                {submittingComment ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
                ) : (
                  <SendHorizontal aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
