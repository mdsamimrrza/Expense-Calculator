// ============================================================
// SahakariSIP — Browser Supabase Client
// ============================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient(supabaseAccessToken?: string) {
  const headers: Record<string, string> = {};
  if (supabaseAccessToken) {
    headers.Authorization = `Bearer ${supabaseAccessToken}`;
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers,
      },
    }
  );
}
