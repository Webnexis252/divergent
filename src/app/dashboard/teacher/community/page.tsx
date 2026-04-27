"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { TeacherSidebar } from "../../_components/teacher-sidebar";
import {
  PageTransition,
  RevealSection,
  StaggerGrid,
  AnimHeading,
  fadeUp,
} from "../../_components/motion-wrappers";

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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1b77ff] text-[16px] font-bold text-white">{initials}</div>
        )}
        <div>
          <h4 className="text-[16px] font-semibold text-black">{post.author.name ?? 'Anonymous'}</h4>
          <div className="flex items-center gap-2 text-[12px] text-[#8b8888]">
            <span>{timeAgo(post.createdAt)}</span>
            {post.channel && (
              <><span>•</span><motion.span className="font-medium text-[#1b77ff]" whileHover={{ scale: 1.05 }}>#{post.channel.name}</motion.span></>
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
          whileHover={{ color: "#1b77ff", scale: 1.05 }} 
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

export default function TeacherCommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Post Form State
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [formError, setFormError] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Channel Form State (Exclusive to Teachers)
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [channelType, setChannelType] = useState('TEXT');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelFormError, setChannelFormError] = useState('');
  const [channelFormSuccess, setChannelFormSuccess] = useState('');

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
      loadPosts();
    }
  };

  // Exclusive Teacher Action: Create Channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setChannelFormError('Channel name is required.');
      return;
    }
    
    setCreatingChannel(true);
    setChannelFormError('');
    setChannelFormSuccess('');
    
    try {
      const res = await fetch('/api/community/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName.trim(),
          description: newChannelDesc.trim() || undefined,
          type: channelType,
          isPrivate: isPrivateChannel
        }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success !== false) {
        setNewChannelName('');
        setNewChannelDesc('');
        setChannelType('TEXT');
        setIsPrivateChannel(false);
        setChannelFormSuccess('Channel created successfully!');
        loadPosts(); // Refresh channels list
        setTimeout(() => setShowChannelForm(false), 2000);
        return;
      }

      setChannelFormError(json?.error || json?.message || 'Failed to create channel.');
    } catch {
      setChannelFormError('Failed to create channel due to network error.');
    } finally {
      setCreatingChannel(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f6] text-black">
      <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)]">
          <TeacherSidebar />

          <main className="space-y-8 px-4 pb-16 pt-6 sm:px-6 lg:px-10 xl:px-14">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
              {/* Feed Column */}
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-gradient-to-r from-[#1b77ff] to-[#38c1ff] p-6 text-white shadow-md sm:p-8">
                  <div>
                    <AnimHeading className="text-[28px] font-bold text-white">Community & Channels</AnimHeading>
                    <p className="mt-2 text-[14px] text-white/90">Engage with students and manage community discussions.</p>
                  </div>
                  <motion.button
                    className="flex shrink-0 items-center gap-2 rounded-[12px] bg-white px-5 py-2.5 text-[14px] font-bold text-[#1b77ff] shadow-sm transition hover:bg-gray-50"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setFormError('');
                      setShowForm(!showForm);
                      setShowChannelForm(false);
                    }}
                  >
                    {showForm ? '✕ Cancel Post' : '+ New Post'}
                  </motion.button>
                </div>

                {/* New Post Form */}
                <AnimatePresence>
                  {showForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
                        <h3 className="mb-4 text-[18px] font-semibold text-black">Create a Post</h3>
                        <p className="mb-4 text-[13px] text-[#8b8888]">Post as a Teacher. (No XP cost for mentors/admins)</p>
                        <input
                          className="mb-3 w-full rounded-[12px] border border-[#e5e7eb] px-4 py-2.5 text-[14px] text-black outline-none focus:border-[#1b77ff]"
                          placeholder="Post title..."
                          value={newPostTitle}
                          onChange={(e) => setNewPostTitle(e.target.value)}
                        />
                        <textarea
                          className="w-full rounded-[12px] border border-[#e5e7eb] px-4 py-2.5 text-[14px] text-black outline-none focus:border-[#1b77ff]"
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
                              className="rounded-[10px] border border-[#bae6fd] bg-white px-4 py-2 text-[14px] font-semibold text-[#1b77ff] transition hover:border-[#38c1ff] hover:text-[#1b77ff] disabled:cursor-not-allowed disabled:opacity-60"
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
                          className="mt-3 rounded-[10px] bg-[#1b77ff] px-6 py-2 text-[14px] font-semibold text-white disabled:opacity-50"
                          whileHover={{ scale: 1.04 }}
                          onClick={handleCreatePost}
                          disabled={submitting || uploadingImage || !newPostTitle.trim() || (!newPostBody.trim() && !selectedImageUrl)}
                        >
                          {submitting ? 'Posting...' : 'Post'}
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <StaggerGrid className="space-y-5">
                  {loading ? (
                    <div className="flex h-32 items-center justify-center rounded-[20px] bg-white shadow-sm">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1b77ff] border-t-transparent" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="rounded-[20px] bg-white p-8 text-center shadow-sm">
                      <p className="text-[#8b8888]">No posts yet. Be the first to start a discussion!</p>
                    </div>
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

              {/* Sidebar Widgets Column */}
              <aside className="space-y-6">
                <RevealSection delay={0.2}>
                  <section className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[18px] font-semibold text-black">Channels</h3>
                      <motion.button
                        className="rounded-full bg-[#eef2ff] p-2 text-[#1b77ff] transition hover:bg-[#1b77ff] hover:text-white"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Create new channel"
                        onClick={() => {
                          setChannelFormError('');
                          setChannelFormSuccess('');
                          setShowChannelForm(!showChannelForm);
                          setShowForm(false);
                        }}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </motion.button>
                    </div>
                    
                    {/* Exclusive Channel Creation Form */}
                    <AnimatePresence>
                      {showChannelForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden rounded-[16px] border border-[#eef2ff] bg-[#f8fafc] p-4"
                        >
                          <h4 className="mb-3 text-[14px] font-bold text-[#1b77ff]">New Channel</h4>
                          <div className="space-y-3">
                            <input
                              className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none focus:border-[#1b77ff]"
                              placeholder="Channel name (e.g., announcements)"
                              value={newChannelName}
                              onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            />
                            <textarea
                              className="w-full rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none focus:border-[#1b77ff]"
                              placeholder="Description (optional)"
                              rows={2}
                              value={newChannelDesc}
                              onChange={(e) => setNewChannelDesc(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <select 
                                className="w-1/2 rounded-[8px] border border-[#e5e7eb] px-3 py-2 text-[13px] outline-none focus:border-[#1b77ff]"
                                value={channelType}
                                onChange={(e) => setChannelType(e.target.value)}
                              >
                                <option value="TEXT">Text</option>
                                <option value="ANNOUNCEMENT">Announcement</option>
                                <option value="RESOURCE">Resource</option>
                              </select>
                              <label className="flex w-1/2 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-3 py-2 text-[13px]">
                                <input 
                                  type="checkbox" 
                                  className="rounded text-[#1b77ff] focus:ring-[#1b77ff]"
                                  checked={isPrivateChannel}
                                  onChange={(e) => setIsPrivateChannel(e.target.checked)}
                                />
                                Private
                              </label>
                            </div>
                            
                            {channelFormError && <p className="text-[12px] text-red-500">{channelFormError}</p>}
                            {channelFormSuccess && <p className="text-[12px] text-green-500">{channelFormSuccess}</p>}
                            
                            <button
                              className="w-full rounded-[8px] bg-[#1b77ff] py-2 text-[13px] font-bold text-white transition hover:bg-[#155fcb] disabled:opacity-50"
                              onClick={handleCreateChannel}
                              disabled={creatingChannel || !newChannelName.trim()}
                            >
                              {creatingChannel ? 'Creating...' : 'Create Channel'}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="mt-4 space-y-2">
                      {channels.length === 0 ? (
                        <p className="text-[13px] text-[#9ca3af]">No channels yet</p>
                      ) : channels.map((ch, i) => (
                        <motion.div
                          key={ch.id}
                          className="flex items-center justify-between rounded-[10px] bg-[#f8fafc] p-3 transition hover:bg-[#eef2ff]"
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.08, duration: 0.4 }}
                        >
                          <span className="text-[14px] font-medium text-black">#{ch.name}</span>
                          <span className="rounded-full bg-[#e2e8f0] px-2 py-0.5 text-[11px] font-medium text-[#64748b]">
                            {ch.postCount} posts
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                </RevealSection>
              </aside>
            </div>
          </main>
        </div>
      </PageTransition>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative max-h-[85vh] w-full max-w-[800px] overflow-y-auto rounded-[24px] bg-white p-8 shadow-2xl"
          >
            <button 
              onClick={() => setSelectedPost(null)}
              className="absolute right-6 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              {selectedPost.author.image ? (
                <Image src={selectedPost.author.image} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1b77ff] text-[18px] font-bold text-white">
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
              <p>Replies view coming soon!</p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
