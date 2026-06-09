import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = `"${process.env.SUPABASE_SERVICE_ROLE_KEY}"`;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  const bytes = Buffer.from('test file contents', 'utf8');
  const { data, error } = await supabaseAdmin.storage
    .from('uploads')
    .upload('test-quotes.txt', bytes, { upsert: true });
  console.log('Admin with quotes:', { data, error });
}
run().catch(console.error);
