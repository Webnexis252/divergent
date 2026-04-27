import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiError, apiSuccess, apiServerError } from '@/lib/api-response';
import { uploadToStorage } from '@/lib/supabase-admin';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/upload/image
 * Accepts multipart/form-data with a single "file" field.
 * Allowed types: JPEG, PNG, WEBP, GIF — up to 10 MB.
 * Uploads to Supabase Storage bucket `uploads` under `images/`.
 * Returns { url: "<public URL>" }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) return apiForbidden('Please sign in to upload files');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return apiError('Only JPEG, PNG, WEBP, and GIF images are allowed', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('Image size must be under 10 MB', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sanitisedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${user.userId}-${sanitisedName}`;
    const storagePath = `images/${filename}`;

    const publicUrl = await uploadToStorage(storagePath, buffer, file.type);

    return apiSuccess({ url: publicUrl }, 'Image uploaded successfully');
  } catch (err) {
    console.error('[UPLOAD_IMAGE_ERROR]', err);
    return apiServerError();
  }
}
