import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Change the last character to make the signature invalid
supabaseServiceKey = supabaseServiceKey.substring(0, supabaseServiceKey.length - 1) + (supabaseServiceKey.endsWith('A') ? 'B' : 'A');

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const bytes = Buffer.from('test file contents', 'utf8');
  const { data, error } = await supabaseAdmin.storage
    .from('uploads')
    .upload('test-invalid.txt', bytes, { upsert: true });
  console.log('Admin with invalid sig:', { data, error });
}
run().catch(console.error);
