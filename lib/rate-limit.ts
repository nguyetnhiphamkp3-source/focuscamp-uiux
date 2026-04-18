/**
 * Rate limiter with Redis backend + in-memory fallback.
 * Redis: works across multiple instances.
 * In-memory: works on single-instance VPS when Redis is unavailable.
 */
import { redis } from "./redis";

/* ===== In-memory fallback ===== */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, 60_000);
}

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSec: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

function rateLimitMemory(opts: RateLimitOptions): RateLimitResult {
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

/* ===== Redis-backed rate limiter ===== */

async function rateLimitRedis(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSec } = opts;
  const redisKey = `rl:${key}`;
  try {
    const count = await redis!.incr(redisKey);
    if (count === 1) {
      await redis!.expire(redisKey, windowSec);
    }
    const ttl = await redis!.ttl(redisKey);
    const resetAt = Date.now() + ttl * 1000;
    if (count > limit) {
      return { ok: false, remaining: 0, resetAt };
    }
    return { ok: true, remaining: limit - count, resetAt };
  } catch {
    // Redis failed — fall back to memory
    return rateLimitMemory(opts);
  }
}

/* ===== Public API ===== */

export async function rateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  if (redis) return rateLimitRedis(opts);
  return rateLimitMemory(opts);
}

/**
 * Extract client IP from NextRequest headers.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = req.headers.get("x-real-ip");
  if (xri) return xri.trim();
  return "unknown";
}
