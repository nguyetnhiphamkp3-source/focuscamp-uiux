import Link from "next/link";
import {
  avatarColorFor,
  nameColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";
import { pillarByKey, DEFAULT_GEMS } from "@/lib/community-config";
import type { PillarConfig, GemsConfig } from "@/lib/community-config";
import { ReactionButton } from "./reaction-button";
import { CotToggleButton } from "./cot-toggle-button";
import { PostMenu } from "./post-menu";
import type { FeedPost } from "@/lib/services/post";

export function PostCard({
  post,
  communitySlug,
  pillars = [],
  currency = DEFAULT_GEMS,
  canEditCot = false,
  currentUserId = null,
  isOwner = false,
  showCotBadge = true,
  href,
}: {
  post: FeedPost;
  communitySlug: string;
  /** Per-community pillar list. Empty array → no pillar tag rendered. */
  pillars?: PillarConfig[];
  /** Per-community currency (for bounty display). Falls back to default. */
  currency?: GemsConfig;
  /** True if current user is community owner (shows Mark CỐT button) */
  canEditCot?: boolean;
  /** Logged-in user id (for edit/delete permissions) */
  currentUserId?: string | null;
  /** True if current user is community owner (for delete permission) */
  isOwner?: boolean;
  /** Show ⭐ CỐT badge next to time if post.isCot */
  showCotBadge?: boolean;
  /** Optional link wrapping title for detail view (e.g., Q&A) */
  href?: string;
}) {
  const pillar = pillarByKey(post.pillar, pillars);
  const authorName = post.user.name || "Ẩn danh";
  const nameColor = nameColorFor(post.user.id);

  return (
    <article className={`feed-post${post.isCot ? " cot-post" : ""}`}>
      <div className="feed-post-head">
        <Link
          href={`/c/${communitySlug}/profile/${post.user.id}`}
          aria-label={`Xem profile của ${authorName}`}
          style={{ flexShrink: 0, lineHeight: 0 }}
        >
          {post.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.user.image}
              alt=""
              className="feed-post-avatar"
              style={{ objectFit: "cover", cursor: "pointer" }}
            />
          ) : (
            <div
              className="feed-post-avatar"
              style={{
                background: avatarColorFor(post.user.id),
                cursor: "pointer",
              }}
            >
              {initials(authorName)}
            </div>
          )}
        </Link>
        <div className="feed-post-author-wrap">
          <div className="feed-post-author">
            <Link
              href={`/c/${communitySlug}/profile/${post.user.id}`}
              style={{ color: nameColor, textDecoration: "none" }}
            >
              {authorName}
            </Link>
          </div>
          <div className="feed-post-time">
            {fmtRelativeTime(post.createdAt)}
            {showCotBadge && post.isCot && (
              <>
                {" · "}
                <span style={{ color: "var(--premium-gold)", fontWeight: 700 }}>
                  ⭐ CỐT
                </span>
              </>
            )}
            {post.bountyAip && post.bountyAip > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--brand-green)", fontWeight: 600 }}>
                  {currency.currencyIcon} {post.bountyAip} {currency.currencyName}
                </span>
              </>
            )}
          </div>
        </div>
        {pillar && (
          <span
            className={`feed-post-pillar-tag${pillar.cssClass ? ` ${pillar.cssClass}` : ""}`}
            style={pillar.color ? { borderColor: pillar.color, color: pillar.color } : undefined}
          >
            {pillar.emoji ? `${pillar.emoji} ` : ""}
            {pillar.label}
          </span>
        )}
      </div>

      {post.title && (
        <Link
          href={href ?? `/c/${communitySlug}/p/${post.id}`}
          className="feed-post-title"
          style={{ textDecoration: "none", color: "inherit", display: "block" }}
        >
          {post.title}
        </Link>
      )}
      <div className="feed-post-body" style={{ whiteSpace: "pre-wrap" }}>
        {post.body}
      </div>

      <div className="feed-post-actions">
        <ReactionButton
          postId={post.id}
          communitySlug={communitySlug}
          initialCount={post.reactionCount}
          initialReacted={post.reactedByMe}
        />
        <Link
          href={`/c/${communitySlug}/p/${post.id}`}
          className="feed-post-action"
          style={{ textDecoration: "none" }}
        >
          💬 {post.commentCount} bình luận
        </Link>
        {canEditCot && (
          <CotToggleButton
            postId={post.id}
            communitySlug={communitySlug}
            initialIsCot={post.isCot}
          />
        )}
        <button
          className="feed-post-action"
          type="button"
          style={{ marginLeft: "auto" }}
        >
          🔗 Share
        </button>
        <PostMenu
          postId={post.id}
          communitySlug={communitySlug}
          canEdit={!!currentUserId && currentUserId === post.user.id}
          canDelete={
            !!currentUserId && (currentUserId === post.user.id || isOwner)
          }
          initial={{ title: post.title, body: post.body, pillar: post.pillar }}
          pillars={pillars}
        />
      </div>
    </article>
  );
}
