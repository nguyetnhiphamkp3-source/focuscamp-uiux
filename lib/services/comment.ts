/**
 * Comment service — create / mark best answer / delete.
 * Comments inherit visibility from parent post; the post is the access-control
 * unit (membership required to post, everyone in the community can read).
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createNotification } from "./notification";

export async function createComment(input: {
  userId: string;
  postId: string;
  body: string;
  parentId?: string;
}) {
  const post = await prisma.post.findUnique({
    where: { id: input.postId },
    select: { id: true, communityId: true },
  });
  if (!post) throw new Error("Bài viết không tồn tại");

  // Membership required to comment
  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: { userId: input.userId, communityId: post.communityId },
    },
  });
  if (!membership) throw new Error("Bạn chưa tham gia cộng đồng này");

  // If replying, verify parent belongs to same post
  if (input.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { postId: true },
    });
    if (!parent || parent.postId !== input.postId) {
      throw new Error("Comment cha không hợp lệ");
    }
  }

  const comment = await prisma.comment.create({
    data: {
      postId: input.postId,
      userId: input.userId,
      parentId: input.parentId ?? null,
      body: input.body.trim(),
    },
  });
  logger.info({ commentId: comment.id, postId: input.postId }, "[comment] created");

  // Emit notifications (non-blocking — failures logged, never thrown)
  const postFull = await prisma.post.findUnique({
    where: { id: input.postId },
    select: {
      userId: true,
      title: true,
      type: true,
      community: { select: { slug: true, name: true } },
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { name: true },
  });
  const actorName = actor?.name ?? "Ai đó";
  const link = postFull
    ? `/c/${postFull.community.slug}/p/${input.postId}`
    : undefined;

  if (input.parentId) {
    // Reply — notify the parent comment's author
    const parent = await prisma.comment.findUnique({
      where: { id: input.parentId },
      select: { userId: true },
    });
    if (parent) {
      await createNotification({
        userId: parent.userId,
        type: "COMMENT_REPLY",
        title: `${actorName} trả lời bình luận của bạn`,
        body: input.body.trim().slice(0, 160),
        actorId: input.userId,
        link,
        communitySlug: postFull?.community.slug,
        postId: input.postId,
        commentId: comment.id,
      });
    }
  } else if (postFull) {
    // Top-level — notify post author
    await createNotification({
      userId: postFull.userId,
      type: "POST_COMMENT",
      title:
        postFull.type === "QUESTION"
          ? `${actorName} trả lời câu hỏi của bạn`
          : `${actorName} bình luận bài của bạn`,
      body: input.body.trim().slice(0, 160),
      actorId: input.userId,
      link,
      communitySlug: postFull.community.slug,
      postId: input.postId,
      commentId: comment.id,
    });
  }

  return comment;
}

/**
 * Mark a comment as the best answer to its post.
 * Allowed to: post author (asker) OR community owner.
 * Only ONE best answer per post — marking a new one clears the previous.
 */
export async function markBestAnswer(input: { userId: string; commentId: string }) {
  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
    include: {
      post: { select: { userId: true, community: { select: { ownerId: true } } } },
    },
  });
  if (!comment) throw new Error("Comment không tồn tại");

  const canMark =
    comment.post.userId === input.userId ||
    comment.post.community.ownerId === input.userId;
  if (!canMark) {
    throw new Error("Chỉ người đặt câu hỏi hoặc admin mới đánh dấu câu trả lời tốt nhất");
  }

  // Toggle: if already best answer, unmark. Else mark this one, unmark others on same post.
  if (comment.isBestAnswer) {
    await prisma.comment.update({
      where: { id: input.commentId },
      data: { isBestAnswer: false },
    });
    return { isBestAnswer: false };
  }

  await prisma.$transaction([
    prisma.comment.updateMany({
      where: { postId: comment.postId, isBestAnswer: true },
      data: { isBestAnswer: false },
    }),
    prisma.comment.update({
      where: { id: input.commentId },
      data: { isBestAnswer: true },
    }),
  ]);

  // Notify the comment author
  const post = await prisma.post.findUnique({
    where: { id: comment.postId },
    select: { community: { select: { slug: true } }, type: true, title: true },
  });
  if (post) {
    await createNotification({
      userId: comment.userId,
      type: "BEST_ANSWER",
      title:
        post.type === "QUESTION"
          ? "Câu trả lời của bạn được chọn là Best Answer ★"
          : "Comment của bạn được ghim ★",
      actorId: input.userId,
      link: `/c/${post.community.slug}/p/${comment.postId}`,
      communitySlug: post.community.slug,
      postId: comment.postId,
      commentId: input.commentId,
    });
  }

  return { isBestAnswer: true };
}

/** Edit a comment body. Allowed to: author of the comment only. */
export async function updateComment(input: {
  userId: string;
  commentId: string;
  body: string;
}) {
  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
    select: { userId: true, postId: true },
  });
  if (!comment) throw new Error("Comment không tồn tại");
  if (comment.userId !== input.userId)
    throw new Error("Chỉ tác giả mới sửa được comment");

  const updated = await prisma.comment.update({
    where: { id: input.commentId },
    data: { body: input.body.trim() },
  });
  logger.info({ commentId: input.commentId, userId: input.userId }, "[comment] updated");
  return { updated, postId: comment.postId };
}

/** Delete a comment. Allowed to: author of the comment OR community owner. */
export async function deleteComment(input: { userId: string; commentId: string }) {
  const comment = await prisma.comment.findUnique({
    where: { id: input.commentId },
    include: {
      post: { select: { community: { select: { ownerId: true } } } },
    },
  });
  if (!comment) throw new Error("Comment không tồn tại");

  const canDelete =
    comment.userId === input.userId ||
    comment.post.community.ownerId === input.userId;
  if (!canDelete) throw new Error("Không có quyền xoá comment này");

  await prisma.comment.delete({ where: { id: input.commentId } });
  logger.info({ commentId: input.commentId, by: input.userId }, "[comment] deleted");
}
