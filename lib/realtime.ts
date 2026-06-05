/**
 * Real-time event bus — pub/sub for SSE connections.
 *
 * Uses Redis pub/sub when available (multi-instance safe).
 * Falls back to in-memory EventEmitter (single-instance).
 *
 * Events:
 *   notification:{userId}  — new notification for a specific user
 *   chat:{channelId}       — new message in a channel
 */
import { EventEmitter } from "events";
import { redis } from "./redis";
import { logger } from "./logger";
import Redis from "ioredis";

const emitter = new EventEmitter();
emitter.setMaxListeners(1000); // support many SSE connections

let subscriber: Redis | null = null;

// When Redis is available, use pub/sub for cross-instance broadcast
if (redis) {
  try {
    subscriber = redis.duplicate();
    subscriber.on("message", (channel, message) => {
      emitter.emit(channel, message);
    });
    subscriber.on("error", (err) => {
      logger.error({ err }, "[realtime] subscriber error");
    });
  } catch {
    // Redis not available — pure in-memory
  }
}

/**
 * Publish an event. Broadcasts to all connected SSE clients.
 */
export async function publish(channel: string, data: unknown): Promise<void> {
  const payload = JSON.stringify(data);
  if (redis) {
    try {
      await redis.publish(channel, payload);
      return;
    } catch {
      // fall through to local emit
    }
  }
  emitter.emit(channel, payload);
}

// Ref-count Redis subscriptions per channel: subscribe on the first listener,
// unsubscribe on the last. Without this, channels (e.g. notification:<userId>)
// accumulate forever on the shared subscriber connection — a slow memory leak.
const channelRefs = new Map<string, number>();

/**
 * Subscribe to a channel. Returns an unsubscribe function.
 */
export function subscribe(
  channel: string,
  handler: (data: string) => void,
): () => void {
  if (subscriber) {
    const n = channelRefs.get(channel) ?? 0;
    if (n === 0) subscriber.subscribe(channel).catch(() => {});
    channelRefs.set(channel, n + 1);
  }
  emitter.on(channel, handler);
  return () => {
    emitter.off(channel, handler);
    if (subscriber) {
      const n = (channelRefs.get(channel) ?? 1) - 1;
      if (n <= 0) {
        channelRefs.delete(channel);
        subscriber.unsubscribe(channel).catch(() => {});
      } else {
        channelRefs.set(channel, n);
      }
    }
  };
}
