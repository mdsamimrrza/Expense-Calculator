// ============================================================
// SahakariSIP — Email Rate Limiter (5 Emails / Hour per User)
// ============================================================

interface RateLimitTracker {
  timestamps: number[];
}

// In-memory store mapping identifier (email or IP) -> timestamps
const rateLimitStore = new Map<string, RateLimitTracker>();

const MAX_REQUESTS_PER_HOUR = 5;
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Rate limiter utility to enforce a strict limit of 5 email requests per hour.
 *
 * @param identifier Email address or IP string to rate-limit
 * @returns { success: boolean; remaining: number; error?: string }
 */
export function checkEmailRateLimit(identifier: string): {
  success: boolean;
  remaining: number;
  error?: string;
} {
  if (!identifier) {
    return { success: false, remaining: 0, error: "Invalid identifier provided for rate limiting." };
  }

  const normalizedKey = identifier.toLowerCase().trim();
  const now = Date.now();

  const tracker = rateLimitStore.get(normalizedKey) || { timestamps: [] };

  // Purge timestamps older than 1 hour (sliding window)
  const validTimestamps = tracker.timestamps.filter((time) => now - time < ONE_HOUR_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    const oldestTimestamp = validTimestamps[0];
    const minutesLeft = Math.ceil((ONE_HOUR_MS - (now - oldestTimestamp)) / (60 * 1000));

    return {
      success: false,
      remaining: 0,
      error: `Rate limit reached. Maximum 5 emails allowed per hour. Please wait ${minutesLeft} minute(s) before requesting another email.`,
    };
  }

  // Record timestamp for current request
  validTimestamps.push(now);
  rateLimitStore.set(normalizedKey, { timestamps: validTimestamps });

  return {
    success: true,
    remaining: MAX_REQUESTS_PER_HOUR - validTimestamps.length,
  };
}
