/**
 * Bookmark service — user saves posts to revisit later.
 * Scoped globally (a bookmark is per-user-per-post, across communities).
 *
 * Cap: each user keeps at most MAX_BOOKMARKS rows. When the user is already
 * at the cap and tries to add another, the add is REFUSED — the client should
 * show a "full, please remove one" message. We don't silently drop the oldest
 * because that would lose data the user intended to keep.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const MAX_BOOKMARKS = 24;

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

  // Refuse if user is already at the cap. They must un-bookmark something first.
  const total = await prisma.bookmark.count({ where: { userId: input.userId } });
  if (total >= MAX_BOOKMARKS) {
    throw new BookmarkLimitReachedError(MAX_BOOKMARKS);
  }

  await prisma.bookmark.create({
    data: { userId: input.userId, postId: input.postId },
  });
  logger.info(
    { userId: input.userId, postId: input.postId },
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
