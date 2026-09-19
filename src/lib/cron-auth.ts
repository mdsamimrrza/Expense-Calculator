// ============================================================
// SahakariSIP — Cron route authorization helper
//
// FAIL CLOSED: if CRON_SECRET is not configured the request is
// rejected (previously the check was skipped when the env var was
// unset, which made the cron endpoints public). Comparison uses a
// timing-safe equality over equal-length buffers.
// ============================================================

import { timingSafeEqual } from "crypto";

export function isAuthorizedCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const provided = req.headers.get("authorization") || "";
  const expected = `Bearer ${secret}`;

  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
