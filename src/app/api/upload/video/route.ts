import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiError, apiSuccess, apiServerError } from '@/lib/api-response';
import { uploadToStorage } from '@/lib/supabase-admin';

const ALLOWED_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogg',
  'video/quicktime': 'mov',
};

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

/**
 * POST /api/upload/video
 * Accepts multipart/form-data with a single "file" field.
 * Allowed types: MP4, WEBM, OGG, MOV — up to 500 MB.
 * Uploads to Supabase Storage bucket `uploads` under `videos/`.
 * Returns { url: "<public URL>" }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Please sign in as an admin to upload videos');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return apiError('Only MP4, WEBM, OGG, and MOV videos are allowed', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('Video size must be under 500 MB', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sanitisedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${user.userId}-${sanitisedName}`;
    const storagePath = `videos/${filename}`;

    const publicUrl = await uploadToStorage(storagePath, buffer, file.type);

    return apiSuccess({ url: publicUrl }, 'Video uploaded successfully');
  } catch (err) {
    console.error('[UPLOAD_VIDEO_ERROR]', err);
    return apiError(err instanceof Error ? err.message : 'Unknown upload error', 500);
  }
}
