import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { apiForbidden, apiError, apiSuccess, apiServerError } from '@/lib/api-response';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req, ['ADMIN', 'SUPER_ADMIN']);
    if (!user) return apiForbidden('Please sign in as an admin');

    const { filename } = await req.json();
    if (!filename) return apiError('Filename required', 400);

    const sanitisedName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `videos/${Date.now()}-${user.userId}-${sanitisedName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('uploads')
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('Signed URL Error:', error);
      return apiServerError('Failed to create signed upload URL');
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(path);

    // Some Supabase versions return the full endpoint, others return just the path
    // Let's ensure signedUrl is absolute
    let signedUrl = data.signedUrl;
    if (signedUrl && signedUrl.startsWith('/')) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        signedUrl = `${supabaseUrl}/storage/v1${signedUrl}`;
    }

    return apiSuccess({
      signedUrl: signedUrl,
      token: data.token,
      path: path,
      publicUrl: publicUrlData.publicUrl
    });
  } catch (err) {
    console.error(err);
    return apiServerError('Error creating signed URL');
  }
}
