"use server";

import { auth } from "@/auth";
import { listFeed, type FeedPost, type PostType } from "@/lib/services/post";

/**
 * Load more posts for cursor-based pagination. Returns a fresh page of
 * FeedPost rows starting AFTER the given cursor id.
 *
 * This is a thin read-only wrapper — no mutation, no revalidation. The
 * caller (a client component) appends rows into its local state.
 */
export async function loadMoreFeedAction(input: {
  communityId: string;
  type: PostType;
  cursor: string;
  pillar?: string;
  sort?: "latest" | "popular";
  isCot?: boolean;
  unansweredOnly?: boolean;
  scope?: "all" | "following" | "bookmarked";
  followedUserIds?: string[];
  bookmarkedPostIds?: string[];
  limit?: number;
}): Promise<{ ok: true; posts: FeedPost[] } | { ok: false; reason: string }> {
  try {
    const s = await auth();
    const posts = await listFeed({
      communityId: input.communityId,
      type: input.type,
      isCot: input.isCot,
      unansweredOnly: input.unansweredOnly,
      pillar: input.pillar,
      sort: input.sort,
      scope: input.scope,
      followedUserIds: input.followedUserIds,
      bookmarkedPostIds: input.bookmarkedPostIds,
      userId: s?.user?.id,
      cursor: input.cursor,
      limit: input.limit ?? 20,
    });
    return { ok: true, posts };
  } catch (err) {
    if (err instanceof Error) return { ok: false, reason: err.message };
    return { ok: false, reason: "unknown" };
  }
}
