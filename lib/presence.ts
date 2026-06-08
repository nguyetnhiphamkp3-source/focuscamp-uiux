/**
 * Presence tracking — Redis-backed heartbeat for online user counts.
 */
import { redis } from "./redis";

const PREFIX = "presence";
const TTL_SECONDS = 90;

export async function recordHeartbeat(communityId: string, userId: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(`${PREFIX}:${communityId}:${userId}`, TTL_SECONDS, "1");
  } catch {
    // non-critical
  }
}

export async function getOnlineCounts(): Promise<Map<string, number>> {
  if (!redis) return new Map();
  const counts = new Map<string, number>();
  let cursor = "0";
  try {
    do {
      const [next, keys] = await redis.scan(
        cursor,
        "MATCH",
        `${PREFIX}:*`,
        "COUNT",
        200,
      );
      cursor = next;
      for (const key of keys) {
        const communityId = key.split(":")[1];
        counts.set(communityId, (counts.get(communityId) ?? 0) + 1);
      }
    } while (cursor !== "0");
  } catch {
    // non-critical — return partial or empty counts
  }
  return counts;
}

/**
 * Check which users from a given list are currently online in a community.
 * Uses Redis pipeline EXISTS — one round-trip for all users.
 * Returns a Set of online userIds.
 */
export async function getOnlineUserIds(
  communityId: string,
  userIds: string[],
): Promise<Set<string>> {
  if (!redis || userIds.length === 0) return new Set();
  try {
    const pipe = redis.pipeline();
    for (const uid of userIds) {
      pipe.exists(`${PREFIX}:${communityId}:${uid}`);
    }
    const results = await pipe.exec();
    const online = new Set<string>();
    if (results) {
      for (let i = 0; i < results.length; i++) {
        const [err, count] = results[i];
        if (!err && count === 1) {
          online.add(userIds[i]);
        }
      }
    }
    return online;
  } catch {
    // non-critical — return empty set
    return new Set();
  }
}
