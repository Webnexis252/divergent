"use client";

import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { DashboardSidebar } from "../_components/sidebar-nav";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
  AnimHeading,
  fadeUp,
} from "../_components/motion-wrappers";

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
};

type Channel = { id: string; name: string; postCount: number };

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}



function PostCard({ 
  post, 
  index,
  onToggleLike,
  onOpenPost
}: { 
  post: Post; 
  index: number;
  onToggleLike: (postId: string) => void;
  onOpenPost: (post: Post) => void;
}) {
  const initials = post.author.name?.charAt(0).toUpperCase() ?? '?';
  return (
    <motion.article
      className="cursor-pointer rounded-[20px] bg-white p-6 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)]"
      variants={fadeUp}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: index * 0.12 }}
      whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      onClick={() => onOpenPost(post)}
    >
      <div className="flex items-center gap-3">
        {post.author.image ? (
          <motion.img src={post.author.image} alt={post.author.name ?? ''} className="h-10 w-10 rounded-full object-cover" whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }} />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#38c1ff] text-[16px] font-bold text-white">{initials}</div>
        )}
        <div>
          <h4 className="text-[16px] font-semibold text-black">{post.author.name ?? 'Anonymous'}</h4>
          <div className="flex items-center gap-2 text-[12px] text-[#8b8888]">
            <span>{timeAgo(post.createdAt)}</span>
            {post.channel && (
              <><span>•</span><motion.span className="font-medium text-[#38c1ff]" whileHover={{ scale: 1.05 }}>#{post.channel.name}</motion.span></>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-[18px] font-semibold text-black">{post.title}</h3>
        {post.body ? (
          <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-[#595959]">{post.body}</p>
        ) : null}
        {post.imageUrl ? (
          <motion.img
            src={post.imageUrl}
            alt={post.title}
            className="mt-4 h-auto max-h-[320px] w-full rounded-[18px] border border-[#e5e7eb] object-cover"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          />
        ) : null}
      </div>
      <div className="mt-5 flex items-center gap-6 border-t border-[#f4f4f4] pt-4">
        <motion.button 
          className="flex items-center gap-2 text-[14px] font-medium text-[#8b8888]" 
          whileHover={{ color: "#38c1ff", scale: 1.05 }} 
          transition={{ duration: 0.15 }}
          onClick={(e) => { e.stopPropagation(); onOpenPost(post); }}
        >
          <span>💬</span> {post.replyCount} Replies
        </motion.button>
        <motion.button 
          className={`flex items-center gap-2 text-[14px] font-medium ${post.likedByMe ? 'text-[#fec600]' : 'text-[#8b8888]'}`} 
          whileHover={{ color: "#fec600", scale: 1.05 }} 
          transition={{ duration: 0.15 }}
          onClick={(e) => { e.stopPropagation(); onToggleLike(post.id); }}
        >
          <span>{post.likedByMe ? '👍' : '👍'}</span> {post.likeCount} Likes
        </motion.button>
      </div>
    </motion.article>
  );
}

export default function DashboardCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = () => {
    fetch('/api/community/posts')
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

  useEffect(() => { 
    loadPosts(); 
    const interval = setInterval(loadPosts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setFormError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success || !payload?.data?.url) {
        setFormError(payload?.error || 'Failed to upload the image.');
        return;
      }

      setSelectedImageUrl(payload.data.url as string);
    } catch {
      setFormError('Failed to upload the image.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || (!newPostBody.trim() && !selectedImageUrl)) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPostTitle,
          postBody: newPostBody,
          imageUrl: selectedImageUrl || undefined,
        }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success !== false) {
        setNewPostTitle('');
        setNewPostBody('');
        setSelectedImageUrl('');
        setShowForm(false);
        loadPosts();
        return;
      }

      setFormError(json?.error || json?.message || 'Could not create your post right now.');
    } catch {
      setFormError('Could not create your post right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = p.likedByMe;
        return {
          ...p,
          likedByMe: !isLiked,
          likeCount: p.likeCount + (isLiked ? -1 : 1)
        };
      }
      return p;
    }));

    try {
      await fetch(`/api/community/posts/${postId}/like`, { method: 'POST' });
    } catch {
      // Revert if failed
      loadPosts();
    }
  };

  return (
    <div className="text-black bg-[#f9fafb] min-h-screen pb-24 sm:bg-[#f7f5f4] sm:pb-0">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
          <div className="hidden lg:block">
            <DashboardSidebar />
          </div>

          <section className="px-4 py-5 sm:px-6 sm:py-6 lg:px-[38px] lg:py-[18px]">
            <div className="mx-auto max-w-[1293px] space-y-10">
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
                {/* Feed */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <AnimHeading className="text-[28px] font-medium text-black">Community Feed</AnimHeading>
                    <motion.button
                      className="rounded-[10px] bg-[#38c1ff] px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm"
                      whileHover={{ scale: 1.06, backgroundColor: "#1baee8", boxShadow: "0 8px 20px rgba(56,193,255,0.4)" }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      onClick={() => {
                        setFormError('');
                        setShowForm(!showForm);
                      }}
                    >
                      {showForm ? '✕ Cancel' : '+ New Post'}
                    </motion.button>
                  </div>

                  {/* New Post Form */}
                  {showForm && (
                    <motion.div
                      initial={{ opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[20px] bg-white p-6 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.08)]"
                    >
                      <h3 className="mb-4 text-[18px] font-semibold text-black">Create a Post</h3>
                      <p className="mb-4 text-[13px] text-[#8b8888]">Posting in the community costs 25 XP. You can attach one image to each post.</p>
                      <input
                        className="mb-3 w-full rounded-[12px] border border-[#e5e7eb] px-4 py-2.5 text-[14px] text-black outline-none focus:border-[#38c1ff]"
                        placeholder="Post title..."
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                      />
                      <textarea
                        className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-2.5 text-[14px] text-black outline-none focus:border-[#38c1ff]"
                        placeholder="What's on your mind?"
                        rows={4}
                        value={newPostBody}
                        onChange={(e) => setNewPostBody(e.target.value)}
                      />
                      <div className="mt-4 rounded-[16px] border border-dashed border-[#cbd5e1] bg-[#f8fbff] p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <input
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            type="file"
                            onChange={handleFileSelect}
                          />
                          <button
                            className="rounded-[10px] border border-[#bae6fd] bg-white px-4 py-2 text-[14px] font-semibold text-[#0284c7] transition hover:border-[#38c1ff] hover:text-[#0369a1] disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={uploadingImage}
                            onClick={() => fileInputRef.current?.click()}
                            type="button"
                          >
                            {uploadingImage ? 'Uploading image...' : 'Attach Image'}
                          </button>
                          {selectedImageUrl ? (
                            <button
                              className="rounded-[10px] px-3 py-2 text-[13px] font-medium text-[#dc2626] transition hover:bg-[#fee2e2]"
                              onClick={() => setSelectedImageUrl('')}
                              type="button"
                            >
                              Remove image
                            </button>
                          ) : (
                            <p className="text-[13px] text-[#8b8888]">PNG, JPG, WEBP, or GIF up to 10 MB.</p>
                          )}
                        </div>

                        {selectedImageUrl ? (
                          <div className="mt-4 overflow-hidden rounded-[16px] border border-[#dbeafe] bg-white p-2">
                            <motion.img
                              src={selectedImageUrl}
                              alt="Selected preview"
                              className="h-auto max-h-[260px] w-full rounded-[12px] object-cover"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            />
                          </div>
                        ) : null}
                      </div>
                      {formError ? (
                        <div className="mt-3 rounded-[12px] border border-[rgba(255,61,0,0.16)] bg-[rgba(255,61,0,0.08)] px-4 py-3 text-[14px] text-[#d93025]">
                          {formError}
                        </div>
                      ) : null}
                      <motion.button
                        className="mt-3 rounded-[10px] bg-[#38c1ff] px-6 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                        whileHover={{ scale: 1.04 }}
                        onClick={handleCreatePost}
                        disabled={submitting || uploadingImage || !newPostTitle.trim() || (!newPostBody.trim() && !selectedImageUrl)}
                      >
                        {submitting ? 'Posting...' : 'Post'}
                      </motion.button>
                    </motion.div>
                  )}

                  <StaggerGrid className="space-y-5">
                    {loading ? (
                      <p className="text-[#8b8888]">Loading feed...</p>
                    ) : posts.length === 0 ? (
                      <p className="text-[#8b8888]">No posts yet. Be the first!</p>
                    ) : (
                      posts.map((post, idx) => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          index={idx} 
                          onToggleLike={handleToggleLike}
                          onOpenPost={setSelectedPost}
                        />
                      ))
                    )}
                  </StaggerGrid>
                </div>

                {/* Sidebar Widgets */}
                <aside className="space-y-6">
                  <RevealSection delay={0.2}>
                    <section className="rounded-[20px] bg-white p-6 shadow-[0px_4px_10px_0px_rgba(0,0,0,0.05)]">
                      <h3 className="text-[18px] font-semibold text-black">Trending Channels</h3>
                      <div className="mt-4 space-y-3">
                        {channels.length === 0 ? (
                          <p className="text-[13px] text-[#9ca3af]">No channels yet</p>
                        ) : channels.slice(0, 5).map((ch, i) => (
                          <motion.div
                            key={ch.id}
                            className="flex items-center justify-between rounded-[10px] p-2 cursor-pointer"
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08, duration: 0.4 }}
                            whileHover={{ backgroundColor: "#f4f4f4", x: 4 }}
                          >
                            <span className="text-[14px] font-medium text-black">#{ch.name}</span>
                            <span className="text-[12px] text-[#8b8888]">{ch.postCount} posts</span>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  </RevealSection>
                </aside>
              </div>
            </div>
          </section>
        </div>
      </PageTransition>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-[800px] max-h-[85vh] overflow-y-auto rounded-[24px] bg-white p-8 shadow-2xl relative"
          >
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              {selectedPost.author.image ? (
                <Image src={selectedPost.author.image} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#38c1ff] text-[18px] font-bold text-white">
                  {selectedPost.author.name?.charAt(0).toUpperCase() ?? '?'}
                </div>
              )}
              <div>
                <h4 className="text-[18px] font-semibold text-black">{selectedPost.author.name ?? 'Anonymous'}</h4>
                <div className="flex items-center gap-2 text-[13px] text-[#8b8888]">
                  <span>{timeAgo(selectedPost.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 border-b border-[#f4f4f4] pb-6">
              <h2 className="text-[24px] font-bold text-black">{selectedPost.title}</h2>
              {selectedPost.body ? (
                <p className="mt-4 whitespace-pre-wrap text-[16px] leading-relaxed text-[#595959]">{selectedPost.body}</p>
              ) : null}
              {selectedPost.imageUrl ? (
                <motion.img
                  src={selectedPost.imageUrl}
                  alt={selectedPost.title}
                  className="mt-5 h-auto max-h-[420px] w-full rounded-[18px] border border-[#e5e7eb] object-contain"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ) : null}
            </div>
            
            <div className="mt-6 flex items-center gap-6">
              <button 
                className={`flex items-center gap-2 text-[15px] font-medium ${selectedPost.likedByMe ? 'text-[#fec600]' : 'text-[#8b8888]'} transition-colors hover:text-[#fec600]`}
                onClick={() => {
                  handleToggleLike(selectedPost.id);
                  // Optimistically update modal state too
                  setSelectedPost(prev => prev ? {
                    ...prev,
                    likedByMe: !prev.likedByMe,
                    likeCount: prev.likeCount + (prev.likedByMe ? -1 : 1)
                  } : null);
                }}
              >
                <span>{selectedPost.likedByMe ? '👍' : '👍'}</span> {selectedPost.likeCount} Likes
              </button>
              <div className="flex items-center gap-2 text-[15px] font-medium text-[#8b8888]">
                <span>💬</span> {selectedPost.replyCount} Replies
              </div>
            </div>
            
            <div className="mt-8 rounded-[16px] bg-[#f9fafb] p-6 text-center text-[#8b8888]">
              <p>Replies are coming soon! Stay tuned.</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
