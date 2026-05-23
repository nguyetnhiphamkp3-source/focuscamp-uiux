/**
 * Bookmark service — user saves posts to revisit later.
 * Bookmarks are PER-COMMUNITY: the cap applies separately in each
 * community the user is part of, so saving in one community doesn't
 * eat the budget for another.
 *
 * Cap: at most MAX_BOOKMARKS per user per community. When the cap is hit,
 * adding another is REFUSED — the client shows a 'full, please remove
 * one' modal. We don't silently drop the oldest because the user
 * explicitly intended to keep each saved post.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const MAX_BOOKMARKS = 14;

export class BookmarkLimitReachedError extends Error {
  constructor(public readonly limit: number) {
    super("bookmark_limit_reached");
    this.name = "BookmarkLimitReachedError";
  }
}

export async function toggleBookmark(input: {
  userId: string;
  postId: string;
}) {
  const existing = await prisma.bookmark.findUnique({
    where: { userId_postId: { userId: input.userId, postId: input.postId } },
  });
  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }

  // Look up post's community so we can count + cap per-community.
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { communityId: true },
  });
  if (!post) throw new Error("post_not_found");

  const total = await prisma.bookmark.count({
    where: {
      userId: input.userId,
      post: { communityId: post.communityId },
    },
  });
  if (total >= MAX_BOOKMARKS) {
    throw new BookmarkLimitReachedError(MAX_BOOKMARKS);
  }

  await prisma.bookmark.create({
    data: { userId: input.userId, postId: input.postId },
  });
  logger.info(
    { userId: input.userId, postId: input.postId, communityId: post.communityId },
    "[bookmark] added"
  );
  return { bookmarked: true };
}

/**
 * List a user's bookmarked posts, newest first, with counts + community.
 */
export async function listBookmarks(input: {
  userId: string;
  communityId?: string; // if set, only from that community (for Feed Bookmarked tab)
  limit?: number;
  cursor?: string;
}) {
  const { userId, communityId, limit = 20, cursor } = input;
  return prisma.bookmark.findMany({
    where: {
      userId,
      ...(communityId ? { post: { communityId } } : {}),
    },
    include: {
      post: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          community: { select: { id: true, slug: true, name: true } },
          _count: { select: { comments: true, reactions: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}
