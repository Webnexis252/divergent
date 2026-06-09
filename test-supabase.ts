import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const bytes = Buffer.from('test file contents', 'utf8');
  const { data, error } = await supabaseAdmin.storage
    .from('uploads')
    .upload('test.txt', bytes, { upsert: true });
  console.log('Admin:', { data, error });
}
run().catch(console.error);
