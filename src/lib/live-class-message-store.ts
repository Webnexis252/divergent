import { randomUUID } from "crypto";
import {
  uploadToStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/supabase-admin";

export type LiveClassMessageRecord = {
  id: string;
  liveClassId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
};

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "") || "default";
}

function metadataPath(liveClassId: string) {
  return `live-class-messages/${safeSegment(liveClassId)}/metadata.json`;
}

function extensionFromFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return ".png";
  const ext = fileName.slice(dotIndex).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  return ".png";
}

export async function listLiveClassMessages(
  liveClassId: string
): Promise<LiveClassMessageRecord[]> {
  const records = await readJsonFromStorage<LiveClassMessageRecord[]>(
    metadataPath(liveClassId),
    []
  );
  return records.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createLiveClassMessage(params: {
  liveClassId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body?: string | null;
  fileName?: string | null;
  bytes?: Buffer | null;
}) {
  let imageUrl: string | null = null;

  if (params.fileName && params.bytes) {
    const extension = extensionFromFileName(params.fileName);
    const fileId = randomUUID();
    const storedFileName = `${fileId}${extension}`;
    const storagePath = `live-class-messages/${safeSegment(
      params.liveClassId
    )}/${storedFileName}`;

    // Determine MIME type from extension
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    const contentType = mimeMap[extension] || "image/png";

    imageUrl = await uploadToStorage(storagePath, params.bytes, contentType);
  }

  const record: LiveClassMessageRecord = {
    id: randomUUID(),
    liveClassId: params.liveClassId,
    senderId: params.senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    body: params.body?.trim() ? params.body.trim() : null,
    imageUrl,
    createdAt: new Date().toISOString(),
  };

  const existing = await listLiveClassMessages(params.liveClassId);
  existing.push(record);
  await writeJsonToStorage(metadataPath(params.liveClassId), existing);

  return record;
}
