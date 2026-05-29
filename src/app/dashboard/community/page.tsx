"use client";

import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { DashboardSidebar } from "../_components/sidebar-nav";
import { PageTransition, fadeUp } from "../_components/motion-wrappers";
import { CornerUpLeft, Copy, Check, Pencil, Paperclip, SendHorizontal, MessageCircle, ThumbsUp } from "lucide-react";

type Post = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  author: { id: string; name: string | null; image: string | null };
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

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function ChatBubble({
  post,
  index,
  currentUser,
  onToggleLike,
  onOpenPost,
  onReply,
  onEdit,
  copiedPostId,
  onCopy,
}: {
  post: Post;
  index: number;
  currentUser: { id: string; name: string | null; role: string } | null;
  onToggleLike: (postId: string) => void;
  onOpenPost: (post: Post) => void;
  onReply: (post: Post) => void;
  onEdit: (post: Post) => void;
  copiedPostId: string | null;
  onCopy: (post: Post) => void;
}) {
  const isOwnPost = currentUser && post.author.id === currentUser.id;
  const initials = post.author.name?.charAt(0).toUpperCase() ?? "?";

  // Pseudo-random colors for author names (only for received messages)
  const colors = [
    "#e53935",
    "#d81b60",
    "#8e24aa",
    "#3949ab",
    "#039be5",
    "#00897b",
    "#43a047",
    "#f4511e",
  ];
  const colorIndex = post.author.id
    ? post.author.id.charCodeAt(0) % colors.length
    : 0;
  const authorColor = colors[colorIndex];

  const handleQuoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.replyTo) return;
    const element = document.getElementById(`msg-${post.replyTo.id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("bg-[#fbf719]/40");
      setTimeout(() => {
        element.classList.remove("bg-[#fbf719]/40");
      }, 1500);
    }
  };

  return (
    <motion.div
      id={`msg-${post.id}`}
      className={`flex w-full mb-3 px-2 sm:px-4 transition-colors duration-500 rounded-lg ${
        isOwnPost ? "justify-end" : "justify-start"
      }`}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    >
      <div
        className={`flex max-w-[85%] sm:max-w-[75%] lg:max-w-[65%] ${
          isOwnPost ? "flex-row-reverse" : "flex-row"
        } items-start gap-2.5`}
      >
        {/* Avatar: Hide for own posts, show for others */}
        {!isOwnPost && (
          <div
            className="flex-shrink-0 cursor-pointer"
            onClick={() => onOpenPost(post)}
          >
            {post.author.image ? (
              <img
                src={post.author.image}
                alt=""
                className="h-8 w-8 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-white font-bold shadow-sm text-xs"
                style={{ backgroundColor: authorColor }}
              >
                {initials}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col group relative">
          <div
            className={`relative rounded-[16px] px-3.5 py-2 shadow-sm border cursor-pointer transition-all duration-200 ${
              isOwnPost
                ? "bg-[#d9fdd3] border-[#d0ecd0] rounded-tr-sm text-black"
                : "bg-white border-[#e5e7eb] rounded-tl-sm text-black"
            }`}
            onClick={() => onOpenPost(post)}
          >
            {/* Header info: Show author name only for others */}
            <div className="flex items-center justify-between gap-4 mb-1">
              {!isOwnPost && (
                <span
                  className="font-bold text-[13px]"
                  style={{ color: authorColor }}
                >
                  {post.author.name ?? "Anonymous"}
                </span>
              )}
              {post.channel && (
                <span className="text-[10px] text-[#38c1ff] font-semibold bg-sky-50 px-1.5 py-0.5 rounded-md border border-sky-100">
                  #{post.channel.name}
                </span>
              )}
            </div>

            {/* Quoted Reply Block */}
            {post.replyTo && (
              <div
                onClick={handleQuoteClick}
                className={`mb-2 rounded-[8px] border-l-4 px-3 py-1.5 text-xs text-left cursor-pointer transition-colors hover:bg-black/5 ${
                  isOwnPost
                    ? "bg-[#cfeec7] border-[#00a884]"
                    : "bg-[#f0f2f5] border-[#38c1ff]"
                }`}
              >
                <div className="font-bold mb-0.5 text-black/70">
                  {post.replyTo.author?.name ?? "Anonymous"}
                </div>
                <div className="text-black/60 line-clamp-2 truncate">
                  {post.replyTo.title || post.replyTo.body}
                </div>
              </div>
            )}

            {/* Title / Subject */}
            {post.title && (
              <h4 className="text-[14px] font-bold text-black mb-0.5 leading-snug">
                {post.title}
              </h4>
            )}

            {/* Message Body */}
            {post.body && (
              <p className="text-[13.5px] leading-normal text-[#111b21] whitespace-pre-wrap">
                {post.body}
              </p>
            )}

            {/* Image attachment */}
            {post.imageUrl && (
              <div className="mt-2 -mx-1 mb-0.5 overflow-hidden rounded-[8px]">
                <img
                  src={post.imageUrl}
                  alt=""
                  className="w-full max-h-[220px] object-cover border border-black/5"
                />
              </div>
            )}

            {/* Footer details: Time + Likes + Action Menu */}
            <div className="flex items-center justify-between gap-5 mt-1.5 pt-1 border-t border-black/5 text-[10.5px] text-gray-500">
              <span>{timeAgo(post.createdAt)}</span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPost(post);
                  }}
                  className="flex items-center gap-1 hover:text-[#38c1ff] transition-colors"
                  title="View details & comments"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-gray-400 hover:text-sky-400 transition-colors" />
                  <span>{post.replyCount}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLike(post.id);
                  }}
                  className={`flex items-center gap-1 transition-colors ${
                    post.likedByMe
                      ? "text-amber-500 font-bold"
                      : "hover:text-amber-500"
                  }`}
                  title="Like message"
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${post.likedByMe ? "fill-amber-500 text-amber-500" : "text-gray-400"}`} />
                  <span>{post.likeCount}</span>
                </button>
              </div>
            </div>
          </div>

          {/* WhatsApp-style Hover Action Buttons */}
          <div
            className={`absolute top-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 rounded-full shadow-lg shadow-zinc-200/30 dark:shadow-none py-1 px-1.5 gap-1 z-20 ${
              isOwnPost ? "-left-28" : "-right-28"
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(post);
              }}
              className="flex items-center justify-center w-7 h-7 rounded-full text-zinc-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 active:scale-90 transition-all duration-150"
              title="Reply"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(post);
              }}
              className={`flex items-center justify-center w-7 h-7 rounded-full active:scale-90 transition-all duration-150 ${
                copiedPostId === post.id
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
                  : "text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              }`}
              title="Copy"
            >
              {copiedPostId === post.id ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {isOwnPost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(post);
                }}
                className="flex items-center justify-center w-7 h-7 rounded-full text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-90 transition-all duration-150"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    null
  );

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

  // Comments states
  const [comments, setComments] = useState<Array<{
    id: string;
    body: string;
    createdAt: string;
    author: { id: string; name: string | null; image: string | null; role?: string };
  }>>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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
        setSelectedPost((prev) =>
          prev ? { ...prev, replyCount: prev.replyCount + 1 } : null
        );

        // Optimistically increment the post in feed list
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === selectedPost.id ? { ...p, replyCount: p.replyCount + 1 } : p
          )
        );
      }
    } catch (err) {
      console.error("Error creating comment:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

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

  const loadPosts = (chanId = selectedChannelId) => {
    const url = chanId
      ? `/api/community/posts?channelId=${chanId}`
      : "/api/community/posts";
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setPosts(json.data.posts);
          setChannels(json.data.channels);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Poll for new messages every 5s
  useEffect(() => {
    loadPosts();
    const interval = setInterval(() => loadPosts(), 5000);
    return () => clearInterval(interval);
  }, [selectedChannelId]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Scroll on initial load or channel switch
  useEffect(() => {
    if (!loading && posts.length > 0) {
      setTimeout(() => scrollToBottom("auto"), 150);
    }
  }, [loading, selectedChannelId]);

  // Scroll when new messages are added
  useEffect(() => {
    if (posts.length > 0) {
      scrollToBottom("smooth");
    }
  }, [posts.length]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
          setNewPostTitle("");
          setNewPostBody("");
          setSelectedImageUrl("");
          setEditingPost(null);
          loadPosts();
          return;
        }
        setFormError(
          json?.error || json?.message || "Failed to update message."
        );
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
          setNewPostTitle("");
          setNewPostBody("");
          setSelectedImageUrl("");
          setReplyingToPost(null);
          loadPosts();
          return;
        }
        setFormError(
          json?.error ||
            json?.message ||
            "Could not create your message right now."
        );
      }
    } catch {
      setFormError("Could not transmit your message. Connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
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
      })
    );

    try {
      await fetch(`/api/community/posts/${postId}/like`, { method: "POST" });
    } catch {
      loadPosts(); // Revert
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
  };

  const handleEditSetup = (post: Post) => {
    setEditingPost(post);
    setReplyingToPost(null);
    setNewPostTitle(post.title);
    setNewPostBody(post.body);
    setSelectedImageUrl(post.imageUrl || "");
  };

  const handleCancelInputMode = () => {
    setReplyingToPost(null);
    setEditingPost(null);
    setNewPostTitle("");
    setNewPostBody("");
    setSelectedImageUrl("");
  };

  // Format active channel header string
  const activeChannelName = selectedChannelId
    ? channels.find((c) => c.id === selectedChannelId)?.name || "Community"
    : "Global Community";

  // Reordering: newest/latest posts rendered at the bottom, oldest at the top
  const orderedPosts = [...posts].reverse();

  return (
    <div className="text-black bg-[#f9fafb] min-h-screen pb-24 sm:bg-[#f7f5f4] sm:pb-0">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <DashboardSidebar />

          <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1293px]">
              <div className="flex h-[calc(100vh-100px)] gap-6 overflow-hidden rounded-[24px] bg-[#f0f2f5] p-2 shadow-sm border border-[#e5e7eb]">
                
                {/* Left Pane: Chats (Channels) */}
                <aside className="hidden w-[320px] flex-col overflow-hidden rounded-[18px] bg-white shadow-sm xl:flex border border-[#e5e7eb]">
                  <div className="border-b px-5 py-4 flex items-center justify-between bg-[#f0f2f5]">
                    <h3 className="text-[18px] font-bold text-black">Chats</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
                    {/* All channels global trigger */}
                    <div
                      onClick={() => setSelectedChannelId(null)}
                      className={`flex cursor-pointer items-center justify-between rounded-[12px] px-3 py-3 transition-colors ${
                        selectedChannelId === null
                          ? "bg-[#e8ecef] font-semibold"
                          : "hover:bg-[#f5f6f6]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00a884] to-[#05cd9c] text-white font-bold text-lg shadow-sm">
                          🌐
                        </div>
                        <div>
                          <span className="block text-[14px] text-black">
                            Global Feed
                          </span>
                          <span className="block text-[11px] text-[#8b8888]">
                            All updates
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic channel items */}
                    {channels.length === 0 ? (
                      <p className="p-3 text-[12px] text-[#9ca3af]">
                        No channels yet
                      </p>
                    ) : (
                      channels.map((ch) => (
                        <div
                          key={ch.id}
                          onClick={() => setSelectedChannelId(ch.id)}
                          className={`flex cursor-pointer items-center justify-between rounded-[12px] px-3 py-3 transition-colors ${
                            selectedChannelId === ch.id
                              ? "bg-[#e8ecef] font-semibold"
                              : "hover:bg-[#f5f6f6]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-[#38c1ff] font-bold text-md border border-sky-200">
                              #
                            </div>
                            <div>
                              <span className="block text-[14px] text-black capitalize">
                                {ch.name}
                              </span>
                              <span className="block text-[11px] text-[#8b8888]">
                                {ch.postCount} updates
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </aside>

                {/* Right Pane: Chat Feed */}
                <div className="relative flex flex-1 flex-col overflow-hidden rounded-[18px] bg-[#efeae2] shadow-sm border border-[#e5e7eb]">
                  {/* Chat Header */}
                  <div className="flex items-center justify-between bg-white px-6 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                        {selectedChannelId ? "#" : "🌐"}
                      </div>
                      <div>
                        <h2 className="text-[15px] font-bold text-black capitalize">
                          {activeChannelName}
                        </h2>
                        <p className="text-[11.5px] text-[#8b8888]">
                          {posts.length} messages
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages scroll area */}
                  <div
                    ref={feedContainerRef}
                    className="flex-1 overflow-y-auto bg-[#efeae2] relative flex flex-col pt-3"
                    style={{
                      backgroundImage:
                        "url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')",
                      backgroundSize: "400px",
                      backgroundBlendMode: "soft-light",
                    }}
                  >
                    <div className="absolute inset-0 bg-[#efeae2]/85 z-0 pointer-events-none"></div>
                    <div className="relative z-10 flex-1 flex flex-col justify-end">
                      {loading ? (
                        <div className="flex flex-1 items-center justify-center py-20">
                          <p className="rounded-full bg-white/90 px-4 py-1.5 text-xs text-[#595959] shadow-sm font-medium border border-gray-100">
                            Loading messages...
                          </p>
                        </div>
                      ) : orderedPosts.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-20">
                          <p className="rounded-full bg-[#fff5c4] px-4 py-1.5 text-xs text-[#7e6406] shadow-sm font-medium border border-[#fde8c4]">
                            No messages here yet. Be the first to say hi!
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col py-4 w-full">
                          {orderedPosts.map((post, idx) => (
                            <ChatBubble
                              key={post.id}
                              post={post}
                              index={idx}
                              currentUser={currentUser}
                              onToggleLike={handleToggleLike}
                              onOpenPost={setSelectedPost}
                              onReply={handleReplySetup}
                              onEdit={handleEditSetup}
                              copiedPostId={copiedPostId}
                              onCopy={handleCopy}
                            />
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reply or Edit Context Banner */}
                  {(replyingToPost || editingPost) && (
                    <div className="bg-[#f0f2f5] border-t border-gray-200 px-4 py-2 flex items-center justify-between z-10">
                      <div className="flex items-center gap-3 border-l-4 border-[#00a884] pl-3">
                        <div className="text-xs text-left">
                          <div className="font-bold text-[#00a884]">
                            {replyingToPost
                              ? `Replying to ${
                                  replyingToPost.author.name ?? "Anonymous"
                                }`
                              : `Editing message`}
                          </div>
                          <div className="text-gray-500 truncate max-w-[450px]">
                            {replyingToPost
                              ? replyingToPost.title || replyingToPost.body
                              : editingPost?.title || editingPost?.body}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleCancelInputMode}
                        className="h-6 w-6 rounded-full hover:bg-black/10 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Bottom input area */}
                  <div className="bg-[#f0f2f5] px-3.5 py-2.5 border-t border-[#e5e7eb] z-10">
                    {formError && (
                      <div className="mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 border border-red-100 shadow-sm text-left">
                        ⚠️ {formError}
                      </div>
                    )}

                    {selectedImageUrl && (
                      <div className="mb-3 relative inline-block">
                        <img
                          src={selectedImageUrl}
                          alt="Preview"
                          className="h-16 w-16 rounded-lg object-cover border-2 border-white shadow-sm"
                        />
                        <button
                          onClick={() => setSelectedImageUrl("")}
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs shadow-sm hover:bg-red-600"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-2.5">
                      <div className="flex flex-1 items-end gap-2.5 rounded-[24px] bg-white px-3.5 py-1.5 shadow-sm border border-gray-200">
                        {/* Attach button */}
                        <button
                          disabled={uploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-gray-400 hover:text-[#00a884] rounded-full hover:bg-gray-50 active:scale-95 transition-all duration-150"
                          title="Attach image"
                        >
                          {uploadingImage ? (
                            <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Paperclip className="w-4 h-4 rotate-45" />
                          )}
                        </button>
                        <input
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          type="file"
                          onChange={handleFileSelect}
                        />

                        {/* Title & Body Inputs */}
                        <div className="flex-1 flex flex-col py-1">
                          <input
                            placeholder="Subject (e.g. Question, announcement)"
                            className="w-full bg-transparent px-1.5 py-0.5 text-xs font-semibold text-black outline-none placeholder:font-normal placeholder:text-gray-400 mb-1 border-b border-transparent focus:border-gray-100 transition-colors"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                          />
                          <textarea
                            className="max-h-[100px] min-h-[22px] w-full resize-none bg-transparent px-1.5 py-0.5 text-[14px] text-black outline-none placeholder:text-gray-400 leading-normal"
                            placeholder="Type a message"
                            rows={1}
                            value={newPostBody}
                            onChange={(e) => {
                              setNewPostBody(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height =
                                e.target.scrollHeight + "px";
                            }}
                          />
                        </div>
                      </div>

                      {/* Submit / Save button */}
                      <button
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:bg-gray-300 disabled:hover:scale-100"
                        onClick={handleSend}
                        disabled={
                          submitting ||
                          uploadingImage ||
                          !newPostTitle.trim() ||
                          (!newPostBody.trim() && !selectedImageUrl)
                        }
                      >
                        {editingPost ? (
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        ) : (
                          <SendHorizontal className="w-[18px] h-[18px]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>
        </div>
      </PageTransition>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[700px] max-h-[85vh] overflow-y-auto rounded-[20px] bg-white p-6 sm:p-8 shadow-2xl relative border border-gray-100"
          >
            <button
              onClick={() => setSelectedPost(null)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              {selectedPost.author.image ? (
                <Image
                  src={selectedPost.author.image}
                  alt=""
                  width={42}
                  height={42}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-[15px] font-bold text-white shadow-sm">
                  {selectedPost.author.name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <h4 className="text-[15px] font-bold text-black">
                  {selectedPost.author.name ?? "Anonymous"}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span>{timeAgo(selectedPost.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-b border-gray-100 pb-5">
              <h2 className="text-[19px] font-bold text-black leading-snug">
                {selectedPost.title}
              </h2>
              {selectedPost.body ? (
                <p className="mt-3.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-[#303030]">
                  {selectedPost.body}
                </p>
              ) : null}
              {selectedPost.imageUrl ? (
                <motion.img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.title}
                  className="mt-4 h-auto max-h-[350px] w-full rounded-[12px] border border-gray-200 object-contain"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : null}
            </div>

            <div className="mt-5 flex items-center gap-5">
              <button
                className={`flex items-center gap-1.5 text-[13.5px] font-medium transition-colors ${
                  selectedPost.likedByMe
                    ? "text-amber-500 font-bold"
                    : "text-gray-500 hover:text-amber-500"
                }`}
                onClick={() => {
                  handleToggleLike(selectedPost.id);
                  setSelectedPost((prev) =>
                    prev
                      ? {
                          ...prev,
                          likedByMe: !prev.likedByMe,
                          likeCount:
                            prev.likeCount + (prev.likedByMe ? -1 : 1),
                        }
                      : null
                  );
                }}
              >
                <ThumbsUp className={`w-4 h-4 ${selectedPost.likedByMe ? "fill-amber-500 text-amber-500" : "text-gray-400"}`} />
                <span>{selectedPost.likeCount} Likes</span>
              </button>
              <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-gray-500">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                <span>{selectedPost.replyCount} Comments</span>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <h3 className="text-[14px] font-bold text-black mb-4 text-left">
                Comments ({comments.length})
              </h3>

              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : comments.length === 0 ? (
                <div className="rounded-[12px] bg-gray-50 p-5 text-center text-xs text-gray-400 border border-gray-100/50 mb-4">
                  No comments yet. Share your thoughts!
                </div>
              ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 mb-4">
                  {comments.map((comment) => {
                     const commentInitials = comment.author.name?.charAt(0).toUpperCase() ?? "?";
                     const isTeacherComment = comment.author.role === "TEACHER" || comment.author.role === "ADMIN" || comment.author.role === "SUPER_ADMIN";
                     return (
                       <div key={comment.id} className="flex items-start gap-3 text-left">
                         {comment.author.image ? (
                           <img
                             src={comment.author.image}
                             alt=""
                             className="h-8 w-8 rounded-full object-cover shadow-xs mt-0.5"
                           />
                         ) : (
                           <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white font-bold text-xs mt-0.5 ${isTeacherComment ? "bg-amber-500 shadow-xs" : "bg-emerald-500 shadow-xs"}`}>
                             {commentInitials}
                           </div>
                         )}
                         <div className="flex-1 rounded-[14px] bg-[#f8f9fa] px-3.5 py-2.5 border border-gray-100/80">
                           <div className="flex items-center justify-between gap-2 mb-1">
                             <div className="flex items-center gap-1.5">
                               <span className="font-bold text-[12.5px] text-gray-800">
                                 {comment.author.name ?? "Anonymous"}
                               </span>
                               {isTeacherComment && (
                                 <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded-md border border-amber-100">
                                   {comment.author.role === "TEACHER" ? "Teacher" : "Admin"}
                                 </span>
                               )}
                             </div>
                             <span className="text-[10px] text-gray-400">
                               {timeAgo(comment.createdAt)}
                             </span>
                           </div>
                           <p className="text-[13px] leading-relaxed text-[#2c3e50] whitespace-pre-wrap">
                             {comment.body}
                           </p>
                         </div>
                       </div>
                     );
                  })}
                </div>
              )}

              {/* New Comment Input Form */}
              <form onSubmit={handleCreateComment} className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={submittingComment}
                  className="flex-1 rounded-[20px] border border-gray-200 bg-gray-50 px-4 py-2 text-[13px] text-black outline-hidden focus:border-emerald-500 focus:bg-white transition-all duration-200"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || submittingComment}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-md disabled:bg-gray-200 disabled:text-gray-400 disabled:scale-100 disabled:shadow-none transition-all duration-200"
                >
                  {submittingComment ? (
                     <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                     <SendHorizontal className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
