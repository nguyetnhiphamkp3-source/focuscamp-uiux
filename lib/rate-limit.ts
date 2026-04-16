/**
 * Simple in-memory rate limiter.
 * Works on single-instance VPS deployments.
 * TODO: swap to @upstash/ratelimit + Redis when scaling to multi-instance.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
// Periodic cleanup to prevent unbounded growth
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, 60_000);
}

export interface RateLimitOptions {
  /** Unique key for the caller (IP, user ID, route etc.) */
  key: string;
  /** Max requests allowed per window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { key, limit, windowSec } = opts;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    const resetAt = now + windowSec * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, resetAt: bucket.resetAt };
  }
  bucket.count += 1;
  return {
    ok: true,
    remaining: limit - bucket.count,
    resetAt: bucket.resetAt,
  };
}

/**
 * Extract client IP from NextRequest headers.
 * Falls back to "unknown" if not available.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
