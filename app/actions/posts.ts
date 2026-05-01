"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createPost,
  toggleReaction,
  toggleCot,
  togglePinPost,
  updatePost,
  deletePost,
} from "@/lib/services/post";
import {
  CreatePostSchema,
  ReactPostSchema,
  MarkCotSchema,
  UpdatePostSchema,
  DeletePostSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

export async function createPostAction(input: {
  communityId: string;
  communitySlug: string;
  type?: "POST" | "QUESTION" | "SIGNAL";
  title?: string;
  body: string;
  pillar?: string;
  bountyAip?: number;
  imageUrl?: string;
}): Promise<ActionResult<{ postId: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  // 10 posts/min/user — covers feed/cot/qa/signals
  const rl = await rateLimit({
    key: `post-create:${s.user.id}`,
    limit: 10,
    windowSec: 60,
  });
  if (!rl.ok) return { ok: false, reason: "rate_limited" };

  const parsed = CreatePostSchema.safeParse({
    communityId: input.communityId,
    type: input.type ?? "POST",
    title: input.title,
    body: input.body,
    pillar: input.pillar,
    bountyAip: input.bountyAip,
    imageUrl: input.imageUrl,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    const post = await createPost({
      userId: s.user.id,
      communityId: parsed.data.communityId,
      type: parsed.data.type,
      title: parsed.data.title || undefined,
      body: parsed.data.body,
      pillar: parsed.data.pillar || undefined,
      bountyAip: parsed.data.bountyAip,
      imageUrl: parsed.data.imageUrl || undefined,
    });
    // Revalidate all feed-like views (feed / cot / qa / signals) for the community
    revalidatePath(`/c/${input.communitySlug}/feed`);
    revalidatePath(`/c/${input.communitySlug}/cot`);
    revalidatePath(`/c/${input.communitySlug}/qa`);
    revalidatePath(`/c/${input.communitySlug}/signals`);
    return { ok: true, data: { postId: post.id } };
  } catch (err) {
    logError(err, { userId: s.user.id, communityId: input.communityId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function toggleReactionAction(input: {
  postId: string;
  communitySlug: string;
}): Promise<ActionResult<{ reacted: boolean; count: number }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  // 60 reactions/min/user — generous; prevents flip-spam
  const rl = await rateLimit({
    key: `reaction:${s.user.id}`,
    limit: 60,
    windowSec: 60,
  });
  if (!rl.ok) return { ok: false, reason: "rate_limited" };

  const parsed = ReactPostSchema.safeParse({ postId: input.postId, emoji: "❤️" });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const res = await toggleReaction({
      userId: s.user.id,
      postId: parsed.data.postId,
      emoji: parsed.data.emoji,
    });
    revalidatePath(`/c/${input.communitySlug}/feed`);
    revalidatePath(`/c/${input.communitySlug}/cot`);
    revalidatePath(`/c/${input.communitySlug}/qa`);
    revalidatePath(`/c/${input.communitySlug}/signals`);
    return { ok: true, data: res };
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function updatePostAction(input: {
  postId: string;
  communitySlug: string;
  title?: string;
  body: string;
  pillar?: string;
}): Promise<ActionResult> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = UpdatePostSchema.safeParse({
    postId: input.postId,
    title: input.title,
    body: input.body,
    pillar: input.pillar,
  });
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message || "invalid" };
  }

  try {
    await updatePost({
      userId: s.user.id,
      postId: parsed.data.postId,
      title: parsed.data.title || undefined,
      body: parsed.data.body,
      pillar: parsed.data.pillar || undefined,
    });
    revalidatePath(`/c/${input.communitySlug}/p/${input.postId}`);
    revalidatePath(`/c/${input.communitySlug}/feed`);
    revalidatePath(`/c/${input.communitySlug}/cot`);
    revalidatePath(`/c/${input.communitySlug}/qa`);
    revalidatePath(`/c/${input.communitySlug}/signals`);
    return { ok: true };
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function deletePostAction(input: {
  postId: string;
  communitySlug: string;
  /** If true, redirect back to the type's list page after delete (used on detail page). */
  redirectAfter?: boolean;
}): Promise<ActionResult & { redirectTo?: string }> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = DeletePostSchema.safeParse({ postId: input.postId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  let redirectTo: string | null = null;
  try {
    const res = await deletePost({
      userId: s.user.id,
      postId: parsed.data.postId,
    });
    // Pick the correct list page by post type
    const listPath =
      res.type === "QUESTION"
        ? `/qa`
        : res.type === "SIGNAL"
          ? `/signals`
          : `/feed`;
    revalidatePath(`/c/${input.communitySlug}${listPath}`);
    revalidatePath(`/c/${input.communitySlug}/cot`);
    if (input.redirectAfter) {
      redirectTo = `/c/${input.communitySlug}${listPath}`;
    }
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }

  // Outside try-catch because redirect throws a control-flow exception
  if (redirectTo) redirect(redirectTo);
  return { ok: true };
}

export async function togglePinAction(input: {
  postId: string;
  communitySlug: string;
}): Promise<ActionResult<{ isPinned: boolean }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = MarkCotSchema.safeParse({ postId: input.postId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const updated = await togglePinPost({
      userId: s.user.id,
      postId: parsed.data.postId,
    });
    revalidatePath(`/c/${input.communitySlug}/feed`);
    revalidatePath(`/c/${input.communitySlug}/cot`);
    revalidatePath(`/c/${input.communitySlug}/qa`);
    revalidatePath(`/c/${input.communitySlug}/signals`);
    revalidatePath(`/c/${input.communitySlug}/p/${input.postId}`);
    return { ok: true, data: { isPinned: updated.isPinned } };
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function toggleCotAction(input: {
  postId: string;
  communitySlug: string;
}): Promise<ActionResult<{ isCot: boolean }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = MarkCotSchema.safeParse({ postId: input.postId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const updated = await toggleCot({ userId: s.user.id, postId: parsed.data.postId });
    revalidatePath(`/c/${input.communitySlug}/feed`);
    revalidatePath(`/c/${input.communitySlug}/cot`);
    return { ok: true, data: { isCot: updated.isCot } };
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
