/**
 * Follow service — platform-global social graph.
 * Used for Feed "Following" tab + future profile follower/following counts.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "./notification";

export async function toggleFollow(input: {
  followerId: string;
  followeeId: string;
}) {
  if (input.followerId === input.followeeId) {
    throw new Error("Không thể tự follow chính mình");
  }
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followeeId: {
        followerId: input.followerId,
        followeeId: input.followeeId,
      },
    },
  });
  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return { following: false };
  }
  await prisma.follow.create({
    data: {
      followerId: input.followerId,
      followeeId: input.followeeId,
    },
  });
  logger.info(
    { follower: input.followerId, followee: input.followeeId },
    "[follow] added"
  );

  // Notify followee
  const follower = await prisma.user.findUnique({
    where: { id: input.followerId },
    select: { name: true, handle: true },
  });
  await createNotification({
    userId: input.followeeId,
    type: "FOLLOW",
    title: `${follower?.name ?? "Ai đó"} đã follow bạn 👥`,
    actorId: input.followerId,
    link: `/u/${follower?.handle ?? input.followerId}`,
  });

  return { following: true };
}

export async function followCounts(userId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.count({ where: { followeeId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
  ]);
  return { followers, following };
}

export async function isFollowing(
  followerId: string,
  followeeId: string
): Promise<boolean> {
  const row = await prisma.follow.findUnique({
    where: { followerId_followeeId: { followerId, followeeId } },
    select: { id: true },
  });
  return !!row;
}

/**
 * Get IDs of users the given user follows. Used to filter feed to
 * "Following" — posts where post.userId IN (followedIds).
 */
export async function followedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followeeId: true },
  });
  return rows.map((r) => r.followeeId);
}
