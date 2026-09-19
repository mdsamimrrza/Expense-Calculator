// ============================================================
// SahakariSIP — Shared Rate Limiter (serverless-safe)
//
// Backed by the public.rate_limit_events table so limits hold
// across serverless instances (the previous module-level Map was
// per-process and wiped on cold start). Falls back to the
// in-memory Map only if the database is unreachable, so a
// Supabase outage degrades the limiter instead of blocking auth.
// ============================================================

import { createClient } from "@supabase/supabase-js";

interface RateLimitTracker {
  timestamps: number[];
}

// In-memory fallback store (per-instance, best-effort)
const memoryStore = new Map<string, RateLimitTracker>();

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  error?: string;
}

function checkInMemory(
  normalizedKey: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const tracker = memoryStore.get(normalizedKey) || { timestamps: [] };
  const valid = tracker.timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= maxRequests) {
    const minutesLeft = Math.ceil((windowMs - (now - valid[0])) / (60 * 1000));
    return {
      success: false,
      remaining: 0,
      error: `Rate limit reached. Please wait ${minutesLeft} minute(s) before trying again.`,
    };
  }

  valid.push(now);
  memoryStore.set(normalizedKey, { timestamps: valid });
  return { success: true, remaining: maxRequests - valid.length };
}

/**
 * Sliding-window rate limit backed by the shared rate_limit_events table.
 *
 * @param identifier Stable key, e.g. "otp_email:<address>" or "login:<address>"
 * @param maxRequests Maximum events allowed inside the window
 * @param windowMinutes Sliding window length in minutes
 * @param label Human-readable name used in the error message
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowMinutes: number,
  label: string
): Promise<RateLimitResult> {
  if (!identifier) {
    return { success: false, remaining: 0, error: "Invalid identifier provided for rate limiting." };
  }

  const normalizedKey = identifier.toLowerCase().trim();
  const supabase = getServiceClient();
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  try {
    const { data: events, error: countErr } = await supabase
      .from("rate_limit_events")
      .select("id")
      .eq("key", normalizedKey)
      .gt("created_at", windowStart);

    if (countErr) throw countErr;
    const count = events?.length ?? 0;

    if (count >= maxRequests) {
      const { data: oldest } = await supabase
        .from("rate_limit_events")
        .select("created_at")
        .eq("key", normalizedKey)
        .gt("created_at", windowStart)
        .order("created_at", { ascending: true })
        .limit(1);

      let minutesLeft = windowMinutes;
      if (oldest && oldest.length > 0) {
        minutesLeft = Math.max(
          1,
          Math.ceil(
            (windowMinutes * 60 * 1000 - (Date.now() - new Date(oldest[0].created_at).getTime())) /
              (60 * 1000)
          )
        );
      }

      return {
        success: false,
        remaining: 0,
        error: `Rate limit reached. Maximum ${maxRequests} ${label} allowed per ${windowMinutes} hour(s). Please wait ${minutesLeft} minute(s) before trying again.`,
      };
    }

    // Record this event. A rare insert race only lets one extra event
    // through — acceptable for a limiter, unlike a dropped deny.
    const { error: insertErr } = await supabase
      .from("rate_limit_events")
      .insert({ key: normalizedKey });
    if (insertErr) throw insertErr;

    return { success: true, remaining: maxRequests - count - 1 };
  } catch {
    // Database unreachable — degrade to per-instance limiting rather
    // than locking everyone out of auth flows.
    return checkInMemory(normalizedKey, maxRequests, windowMinutes * 60 * 1000);
  }
}

/**
 * Back-compat wrapper: OTP email cap (5 per hour per address).
 */
export async function checkEmailRateLimit(email: string): Promise<RateLimitResult> {
  return checkRateLimit(`otp_email:${email}`, 5, 60, "verification codes");
}
