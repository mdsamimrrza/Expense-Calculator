// ============================================================
// SahakariSIP - Server Supabase Client (Server Actions)
// ============================================================

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// One client per function instance: supabase-js reuses its keep-alive HTTP
// connections, so repeat queries skip the TLS handshake a fresh
// createClient() pays on every server action call. The factory keeps the
// concrete generic type (an explicit ReturnType<> annotation would
// collapse the schema to never).
let _client: ReturnType<typeof build> | null = null;
function build() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createClient() {
  if (!_client) _client = build();
  return _client;
}
