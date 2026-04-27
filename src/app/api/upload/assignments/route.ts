import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiError, apiSuccess, apiServerError } from '@/lib/api-response';
import { uploadToStorage } from '@/lib/supabase-admin';

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * POST /api/upload/assignments
 * Accepts multipart/form-data with a single "file" field.
 * Allowed types: PDF, DOCX, DOC, ZIP — up to 20 MB.
 * Uploads to Supabase Storage bucket `uploads` under `assignments/`.
 * Returns { url: "<public URL>" }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['STUDENT', 'MENTOR', 'ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Please sign in to upload files');

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('No file provided', 400);
    }

    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
      return apiError('Only PDF, DOCX, and ZIP files are allowed', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('File size must be under 20 MB', 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sanitisedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `${Date.now()}-${user.userId}-${sanitisedName}`;
    const storagePath = `assignments/${filename}`;

    const publicUrl = await uploadToStorage(storagePath, buffer, file.type);

    return apiSuccess({ url: publicUrl }, 'File uploaded successfully');
  } catch (err) {
    console.error('[UPLOAD_ASSIGNMENT_FILE_ERROR]', err);
    return apiServerError();
  }
}
