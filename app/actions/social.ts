"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { toggleBookmark } from "@/lib/services/bookmark";
import { toggleFollow } from "@/lib/services/follow";
import { logError } from "@/lib/logger";
import { z } from "zod";

type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; reason: string };

const BookmarkSchema = z.object({ postId: z.string().cuid() });
const FollowSchema = z.object({ followeeId: z.string().cuid() });

export async function toggleBookmarkAction(input: {
  postId: string;
  communitySlug?: string;
}): Promise<ActionResult<{ bookmarked: boolean }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = BookmarkSchema.safeParse({ postId: input.postId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const res = await toggleBookmark({
      userId: s.user.id,
      postId: parsed.data.postId,
    });
    if (input.communitySlug) {
      revalidatePath(`/c/${input.communitySlug}/feed`);
      revalidatePath(`/c/${input.communitySlug}/p/${input.postId}`);
    }
    return { ok: true, data: res };
  } catch (err) {
    logError(err, { userId: s.user.id, postId: input.postId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}

export async function toggleFollowAction(input: {
  followeeId: string;
}): Promise<ActionResult<{ following: boolean }>> {
  const s = await auth();
  if (!s?.user?.id) return { ok: false, reason: "unauthorized" };

  const parsed = FollowSchema.safeParse({ followeeId: input.followeeId });
  if (!parsed.success) return { ok: false, reason: "invalid" };

  try {
    const res = await toggleFollow({
      followerId: s.user.id,
      followeeId: parsed.data.followeeId,
    });
    return { ok: true, data: res };
  } catch (err) {
    logError(err, { userId: s.user.id, followeeId: input.followeeId });
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
