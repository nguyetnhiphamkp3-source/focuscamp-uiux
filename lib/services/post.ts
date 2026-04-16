/**
 * Post service — business logic for Feed / Cốt / Q&A / Signals.
 * All pages/actions must go through these functions instead of touching
 * `prisma.post` directly.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const LIKE_EMOJI = "❤️";

export type PostType = "POST" | "QUESTION" | "SIGNAL";

export type FeedPost = Awaited<ReturnType<typeof listFeed>>[number];

/**
 * List posts for a community feed.
 * If `userId` is provided, also returns whether the current user has reacted.
 */
export async function listFeed(params: {
  communityId: string;
  type?: PostType;
  isCot?: boolean;
  pillar?: string;
  userId?: string;
  limit?: number;
  cursor?: string;
}) {
  const { communityId, type = "POST", isCot, pillar, userId, limit = 20, cursor } = params;

  const where = {
    communityId,
    type,
    ...(isCot !== undefined ? { isCot } : {}),
    ...(pillar ? { pillar } : {}),
  };

  const posts = await prisma.post.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true, reactions: true } },
      ...(userId
        ? {
            reactions: {
              where: { userId, emoji: LIKE_EMOJI },
              select: { id: true },
            },
          }
        : {}),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return posts.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    body: p.body,
    pillar: p.pillar,
    tags: p.tags,
    isPinned: p.isPinned,
    isCot: p.isCot,
    bountyAip: p.bountyAip,
    createdAt: p.createdAt,
    user: p.user,
    commentCount: p._count.comments,
    reactionCount: p._count.reactions,
    reactedByMe:
      "reactions" in p && Array.isArray(p.reactions) ? p.reactions.length > 0 : false,
  }));
}

/** Create a post (requires community membership). */
export async function createPost(input: {
  userId: string;
  communityId: string;
  type?: PostType;
  title?: string;
  body: string;
  pillar?: string;
  bountyAip?: number;
}) {
  const { userId, communityId, type = "POST", title, body, pillar, bountyAip } = input;

  // Membership check
  const membership = await prisma.membership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });
  if (!membership) throw new Error("Bạn chưa tham gia cộng đồng này");

  const post = await prisma.post.create({
    data: {
      communityId,
      userId,
      type,
      title: title?.trim() || null,
      body: body.trim(),
      pillar: pillar || null,
      bountyAip: bountyAip ?? null,
    },
  });
  logger.info({ postId: post.id, userId, type }, "[post] created");
  return post;
}

/**
 * Toggle reaction on a post. Returns new reaction state + count.
 * Default emoji is heart.
 */
export async function toggleReaction(input: {
  userId: string;
  postId: string;
  emoji?: string;
}) {
  const emoji = input.emoji || LIKE_EMOJI;
  const existing = await prisma.reaction.findUnique({
    where: { postId_userId_emoji: { postId: input.postId, userId: input.userId, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({
      data: { postId: input.postId, userId: input.userId, emoji },
    });
  }

  const count = await prisma.reaction.count({ where: { postId: input.postId, emoji } });
  return { reacted: !existing, count };
}

/** Toggle Cốt flag (admin / community owner only). */
export async function toggleCot(input: { userId: string; postId: string }) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    include: { community: { select: { ownerId: true } } },
  });
  if (!post) throw new Error("Post không tồn tại");
  if (post.community.ownerId !== input.userId) {
    throw new Error("Chỉ admin cộng đồng mới đánh dấu được Cốt");
  }

  const updated = await prisma.post.update({
    where: { id: input.postId },
    data: {
      isCot: !post.isCot,
      cotApprovedAt: !post.isCot ? new Date() : null,
    },
  });
  logger.info(
    { postId: updated.id, isCot: updated.isCot, by: input.userId },
    "[post] toggleCot"
  );
  return updated;
}
