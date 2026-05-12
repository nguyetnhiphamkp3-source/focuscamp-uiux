"use client";

import { useState, useTransition, useEffect } from "react";
import { PostCard } from "./post-card";
import { loadMoreFeedAction } from "@/app/actions/feed-pagination";
import type { FeedPost, PostType } from "@/lib/services/post";
import type { PillarConfig, GemsConfig } from "@/lib/community-config";

/**
 * Client-side pagination wrapper around PostCard[]. Server renders the
 * first page; this component holds subsequent pages in state so loading
 * more doesn't scroll-reset the view.
 */
export function FeedList({
  initialPosts,
  communityId,
  communitySlug,
  type,
  pillars,
  currency,
  isOwner,
  currentUserId,
  showCotBadge = true,
  pageSize = 20,
  filter,
}: {
  initialPosts: FeedPost[];
  communityId: string;
  communitySlug: string;
  type: PostType;
  pillars: PillarConfig[];
  currency: GemsConfig;
  isOwner: boolean;
  currentUserId: string | null;
  showCotBadge?: boolean;
  pageSize?: number;
  /** Active filters — passed to loadMoreFeedAction so more fetches keep
   *  the same pillar/sort/isCot/scope as the initial render. */
  filter?: {
    pillar?: string;
    sort?: "latest" | "popular";
    isCot?: boolean;
    scope?: "all" | "following" | "bookmarked";
    followedUserIds?: string[];
    bookmarkedPostIds?: string[];
  };
}) {
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialPosts.length >= pageSize);

  // Sync when server refreshes (router.refresh() after post creation)
  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialPosts.length >= pageSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPosts]);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const initialPostIds = initialPosts.map((p) => p.id).join("|");

  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialPosts.length >= pageSize);
  }, [initialPostIds, initialPosts, pageSize]);

  function loadMore() {
    if (!hasMore || pending) return;
    setErr(null);
    const lastId = posts[posts.length - 1]?.id;
    if (!lastId) return;
    start(async () => {
      const res = await loadMoreFeedAction({
        communityId,
        type,
        cursor: lastId,
        pillar: filter?.pillar,
        sort: filter?.sort,
        isCot: filter?.isCot,
        scope: filter?.scope,
        followedUserIds: filter?.followedUserIds,
        bookmarkedPostIds: filter?.bookmarkedPostIds,
        limit: pageSize,
      });
      if (res.ok) {
        setPosts((prev) => [...prev, ...res.posts]);
        if (res.posts.length < pageSize) setHasMore(false);
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <>
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          communitySlug={communitySlug}
          pillars={pillars}
          currency={currency}
          canEditCot={isOwner}
          currentUserId={currentUserId}
          isOwner={isOwner}
          showCotBadge={showCotBadge}
        />
      ))}

      {hasMore && (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            style={{
              padding: "10px 24px",
              borderRadius: 999,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-normal)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Đang tải…" : "Xem thêm"}
          </button>
        </div>
      )}

      {!hasMore && posts.length >= pageSize && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-4) 0",
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          — Hết bài —
        </div>
      )}

      {err && (
        <div
          style={{
            margin: "var(--space-3) 0",
            padding: "6px 10px",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            background: "rgba(218,55,60,0.08)",
            borderRadius: 6,
            textAlign: "center",
          }}
        >
          {err}
        </div>
      )}
    </>
  );
}
