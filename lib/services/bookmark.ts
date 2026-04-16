/**
 * Bookmark service — user saves posts to revisit later.
 * Scoped globally (a bookmark is per-user-per-post, across communities).
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
