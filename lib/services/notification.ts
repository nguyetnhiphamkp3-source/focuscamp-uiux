/**
 * Notification service — central place to create + read user inbox items.
 *
 * Events that create notifications (emitted from other services):
 *   POST_COMMENT        — someone commented on your post
 *   COMMENT_REPLY       — someone replied to your comment
 *   POST_REACTION       — someone liked your post
 *   BEST_ANSWER         — your answer was marked as best
 *   POST_COT            — admin marked your post as CỐT
 *   SUBMISSION_APPROVED — admin approved your challenge submission
 *   SUBMISSION_REJECTED — admin rejected your submission (with note)
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { publish } from "@/lib/realtime";

export type NotificationType =
  | "POST_COMMENT"
  | "COMMENT_REPLY"
  | "POST_REACTION"
  | "BEST_ANSWER"
  | "POST_COT"
  | "SUBMISSION_APPROVED"
  | "SUBMISSION_REJECTED"
  | "FOLLOW"
  | "UNFOLLOW"
  | "AGENT_BROADCAST";

/**
 * Create a notification. No-op (and logs) when recipient === actor — we
 * don't notify users about their own actions.
 */
export async function createNotification(input: {
  userId: string; // recipient
  type: NotificationType;
  title: string;
  body?: string;
  actorId?: string;
  link?: string;
  communitySlug?: string;
  postId?: string;
  commentId?: string;
}) {
  if (input.actorId && input.actorId === input.userId) {
    return null;
  }
  try {
    const notif = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        actorId: input.actorId ?? null,
        link: input.link ?? null,
        communitySlug: input.communitySlug ?? null,
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
      },
    });
    // Push to SSE stream (non-blocking)
    publish(`notification:${input.userId}`, {
      id: notif.id,
      type: input.type,
      title: input.title,
      body: input.body,
      createdAt: notif.createdAt,
    }).catch(() => {});
    return notif;
  } catch (err) {
    // Never let notification failures break the main action
    logger.error(
      { err, input },
      "[notification] create failed (swallowed — non-blocking)"
    );
    return null;
  }
}

/** Inbox: newest first, with actor info for avatars. */
export async function listNotifications(input: {
  userId: string;
  limit?: number;
  unreadOnly?: boolean;
}) {
  const { userId, limit = 50, unreadOnly = false } = input;
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      include: {
        actor: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unread };
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAsRead(input: {
  userId: string;
  notificationId: string;
}) {
  await prisma.notification.updateMany({
    where: { id: input.notificationId, userId: input.userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(input: { userId: string }) {
  const res = await prisma.notification.updateMany({
    where: { userId: input.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count: res.count };
}

/** Delete ALL notifications for a user (rarely used — inbox cleanup). */
export async function clearAll(input: { userId: string }) {
  const res = await prisma.notification.deleteMany({
    where: { userId: input.userId },
  });
  return { count: res.count };
}
