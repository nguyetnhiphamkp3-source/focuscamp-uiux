/**
 * Redis client singleton.
 * Falls back gracefully — if REDIS_URL is not set, exports null.
 * All consumers should check `if (redis)` before using.
 */
import Redis from "ioredis";
import { logger } from "./logger";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn("[redis] REDIS_URL not set — running without Redis (in-memory fallbacks active)");
    return null;
  }
  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    client.on("error", (err) => {
      logger.error({ err }, "[redis] connection error");
    });
    client.on("connect", () => {
      logger.info("[redis] connected");
    });
    client.connect().catch(() => {
      /* handled by error event */
    });
    return client;
  } catch (err) {
    logger.error({ err }, "[redis] failed to create client");
    return null;
  }
}

export const redis: Redis | null =
  globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalForRedis.redis = redis;
}

/**
 * Cache helper — get from Redis or compute + cache.
 * Falls back to direct computation if Redis is unavailable.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  if (!redis) return compute();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    // Redis read failed — compute fresh
  }
  const value = await compute();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Redis write failed — not critical
  }
  return value;
}

/** Invalidate a cache key or pattern */
export async function invalidate(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // non-critical
  }
}
