import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const json = JSON.stringify({ test: "data" }, null, 2);
  const bytes = new TextEncoder().encode(json);

  const { data, error } = await supabaseAdmin.storage
    .from("uploads")
    .upload("test.json", bytes, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    console.error("Storage Error:", error);
  } else {
    console.log("Storage Success:", data);
  }
}
main();
