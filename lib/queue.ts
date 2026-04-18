/**
 * Background job queue — BullMQ + Redis.
 *
 * Falls back to inline execution when Redis is unavailable,
 * so the app works without Redis (just slower, synchronous).
 *
 * Queues:
 *   - "badges"       — checkAndAwardBadges after XP events
 *   - "notifications" — createNotification (fire-and-forget)
 */
import { Queue, Worker, type Job } from "bullmq";
import { logger } from "./logger";

const REDIS_URL = process.env.REDIS_URL;

const connection = REDIS_URL
  ? { url: REDIS_URL }
  : undefined;

/* ===== Queues ===== */

export const badgeQueue = connection
  ? new Queue("badges", { connection })
  : null;

export const notificationQueue = connection
  ? new Queue("notifications", { connection })
  : null;

/* ===== Job dispatch helpers ===== */

export type BadgeJobData = {
  userId: string;
  communityId?: string;
};

export type NotificationJobData = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  actorId?: string;
  link?: string;
  communitySlug?: string;
  postId?: string;
  commentId?: string;
};

/**
 * Enqueue badge check. If no Redis, runs inline (non-blocking catch).
 */
export async function enqueueBadgeCheck(data: BadgeJobData): Promise<void> {
  if (badgeQueue) {
    await badgeQueue.add("check", data, {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 2,
      backoff: { type: "exponential", delay: 3000 },
    });
    return;
  }
  // Inline fallback
  const { checkAndAwardBadges } = await import("./services/badge");
  checkAndAwardBadges(data).catch((err) =>
    logger.warn({ err }, "[queue] inline badge check failed")
  );
}

/**
 * Enqueue notification. If no Redis, runs inline (non-blocking catch).
 */
export async function enqueueNotification(data: NotificationJobData): Promise<void> {
  if (notificationQueue) {
    await notificationQueue.add("send", data, {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
    return;
  }
  // Inline fallback
  const { createNotification } = await import("./services/notification");
  createNotification(data as Parameters<typeof createNotification>[0]).catch(
    (err) => logger.warn({ err }, "[queue] inline notification failed")
  );
}

/* ===== Workers (only start when Redis is available) ===== */

let workersStarted = false;

export function startWorkers(): void {
  if (!connection || workersStarted) return;
  workersStarted = true;

  // Badge worker
  new Worker(
    "badges",
    async (job: Job<BadgeJobData>) => {
      const { checkAndAwardBadges } = await import("./services/badge");
      await checkAndAwardBadges(job.data);
    },
    { connection, concurrency: 3 },
  );

  // Notification worker
  new Worker(
    "notifications",
    async (job: Job<NotificationJobData>) => {
      const { createNotification } = await import("./services/notification");
      await createNotification(job.data as Parameters<typeof createNotification>[0]);
    },
    { connection, concurrency: 5 },
  );

  logger.info("[queue] workers started (badges, notifications)");
}
