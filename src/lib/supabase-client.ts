import { createClient } from "@supabase/supabase-js";

// Lovable's Supabase integration (Cloud tab -> Secrets) injects these two.
// If you're connecting Supabase manually instead, put the same values in a
// .env.local file at the project root, e.g.:
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...   (the anon/public key, never the service role key)
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseKey =
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ??
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * The Supabase client, or `null` if the project hasn't been connected yet.
 * Every call site should check `isSupabaseConfigured` / handle `null` so the
 * app can still render a helpful "connect Supabase" message instead of
 * crashing on a missing env var.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
