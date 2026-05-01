"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createComment,
  markBestAnswer,
  deleteComment,
  updateComment,
} from "@/lib/services/comment";
import {
  CreateCommentSchema,
  CommentIdSchema,
  UpdateCommentSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

function bumpPostPaths(communitySlug: string, postId: string) {
  revalidatePath(`/c/${communitySlug}/p/${postId}`);
  revalidatePath(`/c/${communitySlug}/feed`);
  revalidatePath(`/c/${communitySlug}/cot`);
  revalidatePath(`/c/${communitySlug}/qa`);
  revalidatePath(`/c/${communitySlug}/signals`);
}

export async function createCommentAction(input: {
  postId: string;
  parentId?: string;
  body: string;
  communitySlug: string;
}): Promise<ActionResult<{ commentId: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  // 30 comments/min/user — generous but caps spam bursts
  const rl = await rateLimit({
    key: `comment-create:${s.user.id}`,
    limit: 30,
    windowSec: 60,
  });
  if (!rl.ok) return { ok: false, reason: "rate_limited" };

  const parsed = CreateCommentSchema.safeParse({
    postId: input.postId,
    parentId: input.parentId,
    body: input.body,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const c = await createComment({
      userId: s.user.id,
      postId: parsed.data.postId,
      body: parsed.data.body,
      parentId: parsed.data.parentId,
    });
    bumpPostPaths(input.communitySlug, input.postId);
    return { ok: true, data: { commentId: c.id } };
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function markBestAnswerAction(input: {
  commentId: string;
  postId: string;
  communitySlug: string;
}): Promise<ActionResult<{ isBestAnswer: boolean }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CommentIdSchema.safeParse({ commentId: input.commentId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const res = await markBestAnswer({
      userId: s.user.id,
      commentId: parsed.data.commentId,
    });
    bumpPostPaths(input.communitySlug, input.postId);
    return { ok: true, data: res };
  } catch (err) {
    logError(err, { userId: s.user.id, commentId: input.commentId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updateCommentAction(input: {
  commentId: string;
  body: string;
  postId: string;
  communitySlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdateCommentSchema.safeParse({
    commentId: input.commentId,
    body: input.body,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updateComment({
      userId: s.user.id,
      commentId: parsed.data.commentId,
      body: parsed.data.body,
    });
    bumpPostPaths(input.communitySlug, input.postId);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, commentId: input.commentId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function deleteCommentAction(input: {
  commentId: string;
  postId: string;
  communitySlug: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CommentIdSchema.safeParse({ commentId: input.commentId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    await deleteComment({ userId: s.user.id, commentId: parsed.data.commentId });
    bumpPostPaths(input.communitySlug, input.postId);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, commentId: input.commentId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
