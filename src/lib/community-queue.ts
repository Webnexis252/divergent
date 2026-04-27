import type { UserRole } from "@prisma/client";
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

type PostData = {
  id: string;
  title: string;
  body: string;
  authorId: string;
  channelId: string | null;
  createdAt: Date;
};

type MessageData = {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  attachmentUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Global queues for buffering database writes
const postQueue: PostData[] = [];
const messageQueue: MessageData[] = [];
let isFlushingPosts = false;
let isFlushingMessages = false;

// Basic in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

// Simple in-memory caches to prevent DB read exhaustion
const userCache = new Map<
  string,
  { id: string; name: string | null; image: string | null; role: UserRole }
>();
const channelCache = new Map<
  string,
  { id: string; name: string; type: string } | null
>();

export async function getCachedUser(userId: string) {
  if (userCache.has(userId)) return userCache.get(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, role: true },
  });
  if (user) {
    if (userCache.size > 10000) {
      const firstKey = userCache.keys().next().value;
      if (firstKey) userCache.delete(firstKey);
    }
    userCache.set(userId, user);
  }
  return user;
}

export async function getCachedChannel(channelId: string | null) {
  if (!channelId) return null;
  if (channelCache.has(channelId)) return channelCache.get(channelId);
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { id: true, name: true, type: true },
  });
  if (channelCache.size > 1000) {
    const firstKey = channelCache.keys().next().value;
    if (firstKey) channelCache.delete(firstKey);
  }
  channelCache.set(channelId, channel);
  return channel;
}

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 5000; // 5 seconds
  const maxRequests = 10; // max 10 contributions per 5 seconds

  let userStatus = rateLimitMap.get(userId);
  if (!userStatus || now - userStatus.lastReset > windowMs) {
    userStatus = { count: 0, lastReset: now };
  }

  if (userStatus.count >= maxRequests) {
    return false;
  }

  userStatus.count++;
  rateLimitMap.set(userId, userStatus);
  return true;
}

export async function enqueuePost(data: Omit<PostData, 'id' | 'createdAt'>): Promise<PostData> {
  const post: PostData = {
    ...data,
    id: randomUUID(),
    createdAt: new Date(),
  };
  postQueue.push(post);
  if (postQueue.length >= 100 && !isFlushingPosts) {
    setTimeout(flushPostQueue, 0);
  }
  return post;
}

export async function enqueueMessage(data: Omit<MessageData, 'id' | 'createdAt' | 'updatedAt'>): Promise<MessageData> {
  const now = new Date();
  const message: MessageData = {
    ...data,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  messageQueue.push(message);
  if (messageQueue.length >= 200 && !isFlushingMessages) {
    setTimeout(flushMessageQueue, 0);
  }
  return message;
}

async function flushPostQueue() {
  if (postQueue.length === 0 || isFlushingPosts) return;
  isFlushingPosts = true;
  const batchSize = Math.min(postQueue.length, 500);
  const currentBatch = postQueue.splice(0, batchSize);
  try {
    await prisma.post.createMany({ data: currentBatch, skipDuplicates: true });
    console.log(`[Queue] Flushed ${batchSize} posts.`);
  } catch (error) {
    console.error('[Queue] Post flush failed:', error);
  } finally {
    isFlushingPosts = false;
    if (postQueue.length > 0) setTimeout(flushPostQueue, 100);
  }
}

async function flushMessageQueue() {
  if (messageQueue.length === 0 || isFlushingMessages) return;
  isFlushingMessages = true;
  const batchSize = Math.min(messageQueue.length, 1000);
  const currentBatch = messageQueue.splice(0, batchSize);
  try {
    await prisma.message.createMany({ data: currentBatch, skipDuplicates: true });
    console.log(`[Queue] Flushed ${batchSize} messages.`);
  } catch (error) {
    console.error('[Queue] Message flush failed:', error);
  } finally {
    isFlushingMessages = false;
    if (messageQueue.length > 0) setTimeout(flushMessageQueue, 100);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (!isFlushingPosts && postQueue.length > 0) flushPostQueue();
    if (!isFlushingMessages && messageQueue.length > 0) flushMessageQueue();
    
    if (rateLimitMap.size > 10000) {
      const now = Date.now();
      for (const [key, value] of rateLimitMap.entries()) {
        if (now - value.lastReset > 60000) rateLimitMap.delete(key);
      }
    }
  }, 3000);
}
