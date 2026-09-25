// ============================================================
// SahakariSIP - Server Supabase Client (Server Actions)
// ============================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof build> | null = null;
function build() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createSupabaseClient(url, key);
}

export async function createClient() {
  if (!_client) _client = build();
  return _client;
}
