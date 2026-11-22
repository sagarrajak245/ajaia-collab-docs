import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton browser client, used only for Realtime presence (anon key is public).
let client: SupabaseClient | null = null;

/** Returns the shared client, or null when env vars are missing (feature degrades silently). */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
