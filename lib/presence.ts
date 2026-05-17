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
