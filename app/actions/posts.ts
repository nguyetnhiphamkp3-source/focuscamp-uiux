"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createPost, toggleReaction, toggleCot } from "@/lib/services/post";
import {
  CreatePostSchema,
  ReactPostSchema,
  MarkCotSchema,
} from "@/lib/validations";
import { logError } from "@/lib/logger";

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
}): Promise<ActionResult<{ postId: string }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = CreatePostSchema.safeParse({
    communityId: input.communityId,
    type: input.type ?? "POST",
    title: input.title,
    body: input.body,
    pillar: input.pillar,
    bountyAip: input.bountyAip,
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
