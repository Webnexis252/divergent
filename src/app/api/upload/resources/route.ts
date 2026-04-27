import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiError, apiSuccess, apiServerError } from '@/lib/api-response';
import { uploadToStorage } from '@/lib/supabase-admin';

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
};

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * POST /api/upload/resources
 * Accepts multipart/form-data with a single "file" field.
 * Allowed types: PDF only (as requested) — up to 50 MB.
 * Uploads to Supabase Storage bucket `uploads` under `resources/`.
 * Returns { url: "<public URL>" }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Please sign in as a teacher/admin to upload resources');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return apiError('Only PDF files are allowed', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('File size must be under 50 MB', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sanitisedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${user.userId}-${sanitisedName}`;
    const storagePath = `resources/${filename}`;

    const publicUrl = await uploadToStorage(storagePath, buffer, file.type);

    return apiSuccess({ url: publicUrl }, 'Resource PDF uploaded successfully');
  } catch (err) {
    console.error('[UPLOAD_RESOURCE_ERROR]', err);
    return apiServerError();
  }
}
