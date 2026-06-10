// Tiny best-effort in-memory rate limiter (no dependency).
//
// IMPORTANT: this is per-instance state. On serverless / Fluid Compute each
// instance keeps its own counters, so it does NOT give a global guarantee — it
// is a cheap first line of defense (e.g. against a single host hammering invite
// codes). The real, global control is the Vercel Firewall WAF rate-limit rule
// documented in vercel.json. Keep both.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  success: boolean;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfter: number;
}

/**
 * Fixed-window limiter. Allows `limit` hits per `windowMs` for a given key.
 * Returns success=false once the window's allowance is exhausted.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, retryAfter: 0 };
  }

  if (bucket.count >= limit) {
    return { success: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { success: true, retryAfter: 0 };
}

/** Best-effort client IP from the standard proxy headers (Vercel sets these). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
