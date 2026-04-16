/**
 * Post service — business logic for Feed / Cốt / Q&A / Signals.
 * All pages/actions must go through these functions instead of touching
 * `prisma.post` directly.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getPillars } from "@/lib/community-config";

const LIKE_EMOJI = "❤️";

export type PostType = "POST" | "QUESTION" | "SIGNAL";

export type FeedPost = Awaited<ReturnType<typeof listFeed>>[number];

/**
 * List posts for a community feed.
 * If `userId` is provided, also returns whether the current user has reacted.
 */
export type FeedSort = "latest" | "popular";

export async function listFeed(params: {
  communityId: string;
  type?: PostType;
  isCot?: boolean;
  pillar?: string;
  userId?: string;
  limit?: number;
  cursor?: string;
  sort?: FeedSort;
}) {
  const {
    communityId,
    type = "POST",
    isCot,
    pillar,
    userId,
    limit = 20,
    cursor,
    sort = "latest",
  } = params;

  const where = {
    communityId,
    type,
    ...(isCot !== undefined ? { isCot } : {}),
    ...(pillar ? { pillar } : {}),
  };

  // Popular sort: pinned first, then by engagement (reactions+comments),
  // then recency as tiebreak. Latest sort: pinned first, then recency.
  const orderBy =
    sort === "popular"
      ? [
          { isPinned: "desc" as const },
          { reactions: { _count: "desc" as const } },
          { comments: { _count: "desc" as const } },
          { createdAt: "desc" as const },
        ]
      : [{ isPinned: "desc" as const }, { createdAt: "desc" as const }];

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
    orderBy,
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

/**
 * Fetch a single post with its comments, for the detail view.
 * Returns null if the post doesn't exist.
 */
export async function getPostWithComments(postId: string, userId?: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { id: true, name: true, image: true } },
      community: { select: { id: true, slug: true, ownerId: true } },
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
  });
  if (!post) return null;

  // Increment view count fire-and-forget (don't block render)
  prisma.post
    .update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {
      /* ignore — view count is best-effort */
    });

  const comments = await prisma.comment.findMany({
    where: { postId },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: [{ isBestAnswer: "desc" }, { createdAt: "asc" }],
  });

  return {
    post: {
      id: post.id,
      type: post.type,
      title: post.title,
      body: post.body,
      pillar: post.pillar,
      tags: post.tags,
      isPinned: post.isPinned,
      isCot: post.isCot,
      bountyAip: post.bountyAip,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      user: post.user,
      community: post.community,
      commentCount: post._count.comments,
      reactionCount: post._count.reactions,
      reactedByMe:
        "reactions" in post && Array.isArray(post.reactions)
          ? post.reactions.length > 0
          : false,
    },
    comments: comments.map((c) => ({
      id: c.id,
      body: c.body,
      isBestAnswer: c.isBestAnswer,
      parentId: c.parentId,
      createdAt: c.createdAt,
      user: c.user,
    })),
  };
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

  // Membership check (+ load community config to validate pillar)
  const [membership, community] = await Promise.all([
    prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId } },
    }),
    prisma.community.findUnique({
      where: { id: communityId },
      select: { pillarsConfig: true },
    }),
  ]);
  if (!membership) throw new Error("Bạn chưa tham gia cộng đồng này");
  if (!community) throw new Error("Cộng đồng không tồn tại");

  // Ignore pillar that doesn't match community's configured pillars.
  let validatedPillar: string | null = null;
  if (pillar) {
    const pillarKeys = new Set(getPillars(community).map((p) => p.key));
    validatedPillar = pillarKeys.has(pillar) ? pillar : null;
  }

  const post = await prisma.post.create({
    data: {
      communityId,
      userId,
      type,
      title: title?.trim() || null,
      body: body.trim(),
      pillar: validatedPillar,
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

/**
 * Edit a post's body/title/pillar. Allowed to: post author only.
 * Admin cannot edit others' posts — only delete (separate concern).
 */
export async function updatePost(input: {
  userId: string;
  postId: string;
  title?: string;
  body: string;
  pillar?: string;
}) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    include: { community: { select: { pillarsConfig: true } } },
  });
  if (!post) throw new Error("Bài viết không tồn tại");
  if (post.userId !== input.userId)
    throw new Error("Chỉ tác giả mới sửa được bài");

  // Validate pillar against community config
  let validatedPillar: string | null = null;
  if (input.pillar) {
    const pillarKeys = new Set(
      getPillars(post.community).map((p) => p.key)
    );
    validatedPillar = pillarKeys.has(input.pillar) ? input.pillar : null;
  }

  const updated = await prisma.post.update({
    where: { id: input.postId },
    data: {
      title: input.title?.trim() || null,
      body: input.body.trim(),
      pillar: validatedPillar,
    },
  });
  logger.info({ postId: input.postId, userId: input.userId }, "[post] updated");
  return updated;
}

/**
 * Delete a post + all cascades (comments, reactions, votes).
 * Allowed to: post author OR community owner.
 */
export async function deletePost(input: { userId: string; postId: string }) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    include: { community: { select: { slug: true, ownerId: true } } },
  });
  if (!post) throw new Error("Bài viết không tồn tại");

  const canDelete =
    post.userId === input.userId || post.community.ownerId === input.userId;
  if (!canDelete) throw new Error("Không có quyền xoá bài này");

  await prisma.post.delete({ where: { id: input.postId } });
  logger.info(
    { postId: input.postId, by: input.userId, author: post.userId },
    "[post] deleted"
  );
  return { communitySlug: post.community.slug, type: post.type };
}

/** Toggle pinned state on a post (admin / community owner only). */
export async function togglePinPost(input: { userId: string; postId: string }) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    include: { community: { select: { ownerId: true } } },
  });
  if (!post) throw new Error("Post không tồn tại");
  if (post.community.ownerId !== input.userId) {
    throw new Error("Chỉ admin cộng đồng mới ghim bài");
  }
  const updated = await prisma.post.update({
    where: { id: input.postId },
    data: { isPinned: !post.isPinned },
  });
  logger.info(
    { postId: updated.id, isPinned: updated.isPinned, by: input.userId },
    "[post] togglePin"
  );
  return updated;
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
