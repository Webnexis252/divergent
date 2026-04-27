import { randomUUID } from "crypto";
import {
  uploadToStorage,
  readJsonFromStorage,
  writeJsonToStorage,
} from "@/lib/supabase-admin";

export type LiveClassSketchRecord = {
  id: string;
  liveClassId: string;
  studentId: string;
  studentName: string;
  note: string | null;
  imageUrl: string;
  createdAt: string;
};

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "") || "default";
}

function metadataPath(liveClassId: string) {
  return `live-class-sketches/${safeSegment(liveClassId)}/metadata.json`;
}

function extensionFromFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0) return ".png";
  const ext = fileName.slice(dotIndex).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return ext;
  return ".png";
}

export async function listLiveClassSketches(
  liveClassId: string
): Promise<LiveClassSketchRecord[]> {
  const records = await readJsonFromStorage<LiveClassSketchRecord[]>(
    metadataPath(liveClassId),
    []
  );
  return records.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createLiveClassSketch(params: {
  liveClassId: string;
  studentId: string;
  studentName: string;
  note?: string | null;
  fileName: string;
  bytes: Buffer;
}) {
  const extension = extensionFromFileName(params.fileName);
  const fileId = randomUUID();
  const storedFileName = `${fileId}${extension}`;
  const storagePath = `live-class-sketches/${safeSegment(
    params.liveClassId
  )}/${storedFileName}`;

  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const contentType = mimeMap[extension] || "image/png";

  const imageUrl = await uploadToStorage(storagePath, params.bytes, contentType);

  const record: LiveClassSketchRecord = {
    id: fileId,
    liveClassId: params.liveClassId,
    studentId: params.studentId,
    studentName: params.studentName,
    note: params.note?.trim() ? params.note.trim() : null,
    imageUrl,
    createdAt: new Date().toISOString(),
  };

  const existing = await listLiveClassSketches(params.liveClassId);
  existing.unshift(record);
  await writeJsonToStorage(metadataPath(params.liveClassId), existing);

  return record;
}
