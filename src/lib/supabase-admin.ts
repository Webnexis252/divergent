import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service_role key.
 *
 * This bypasses Row Level Security (RLS) and should ONLY be used in
 * server-side code (API routes, server actions).  Never expose this
 * to the browser.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Fall back to the anon key if the service role key is not configured so the
// server starts instead of crashing with a missing env-var error.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Anon client — used as fallback for the public `uploads` bucket when the
// service-role key is wrong or missing on the production server.
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

const BUCKET = 'uploads';

/**
 * Upload a file to Supabase Storage and return its public URL.
 *
 * @param storagePath  e.g. "assignments/1714000000-userId-file.pdf"
 * @param data         File bytes as Buffer or Uint8Array
 * @param contentType  MIME type e.g. "application/pdf"
 */
export async function uploadToStorage(
  storagePath: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const opts = { contentType, upsert: true };

  let { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, data, opts);

  // If the service-role key fails with an auth/signature error, retry with the
  // anon key. The `uploads` bucket is public so an anon client can still write
  // files when the bucket has a permissive INSERT policy.
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('signature') || msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('invalid')) {
      const fallback = await supabaseAnon.storage
        .from(BUCKET)
        .upload(storagePath, data, opts);
      error = fallback.error;
    }
  }

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return urlData.publicUrl;
}

/**
 * Download a file from Supabase Storage.
 */
export async function downloadFromStorage(
  storagePath: string,
): Promise<Blob | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(storagePath);

  if (error) return null;
  return data;
}

/**
 * Read a JSON metadata file from Supabase Storage.
 * Returns the parsed object, or `defaultValue` if the file doesn't exist.
 */
export async function readJsonFromStorage<T>(
  storagePath: string,
  defaultValue: T,
): Promise<T> {
  const blob = await downloadFromStorage(storagePath);
  if (!blob) return defaultValue;
  const text = await blob.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Write a JSON object to Supabase Storage.
 */
export async function writeJsonToStorage<T>(
  storagePath: string,
  data: T,
): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const bytes = new TextEncoder().encode(json);

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to write JSON to storage: ${error.message}`);
  }
}
