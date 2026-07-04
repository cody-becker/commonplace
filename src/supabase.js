import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing Supabase config. Copy .env.example to .env and fill in your project URL and anon key."
  );
}

export const supabase = createClient(url, key);

// Simple key-value layer on top of the `kv` table.
// Each row is (user_id, key, jsonb value); RLS keeps it private per user.

export async function loadKey(userId, key, fallback) {
  const { data, error } = await supabase
    .from("kv")
    .select("value")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("load failed", key, error);
    return fallback;
  }
  return data ? data.value : fallback;
}

export async function saveKey(userId, key, value) {
  const { error } = await supabase
    .from("kv")
    .upsert(
      { user_id: userId, key, value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );
  if (error) console.error("save failed", key, error);
}
