import Link from "next/link";
import {
  avatarColorFor,
  nameColorFor,
  initials,
  fmtRelativeTime,
  pillarFor,
} from "@/lib/brand";
import { ReactionButton } from "./reaction-button";
import { CotToggleButton } from "./cot-toggle-button";
import type { FeedPost } from "@/lib/services/post";

export function PostCard({
  post,
  communitySlug,
  canEditCot = false,
  showCotBadge = true,
  href,
}: {
  post: FeedPost;
  communitySlug: string;
  /** True if current user is community owner (shows Mark CỐT button) */
  canEditCot?: boolean;
  /** Show ⭐ CỐT badge next to time if post.isCot */
  showCotBadge?: boolean;
  /** Optional link wrapping title for detail view (e.g., Q&A) */
  href?: string;
}) {
  const pillar = pillarFor(post.pillar);
  const authorName = post.user.name || "Ẩn danh";
  const nameColor = nameColorFor(post.user.id);

  return (
    <article className={`feed-post${post.isCot ? " cot-post" : ""}`}>
      <div className="feed-post-head">
        {post.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.user.image}
            alt=""
            className="feed-post-avatar"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            className="feed-post-avatar"
            style={{ background: avatarColorFor(post.user.id) }}
          >
            {initials(authorName)}
          </div>
        )}
        <div className="feed-post-author-wrap">
          <div className="feed-post-author">
            <span style={{ color: nameColor }}>{authorName}</span>
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
                  💰 {post.bountyAip} AIP
                </span>
              </>
            )}
          </div>
        </div>
        {pillar && (
          <span className={`feed-post-pillar-tag ${pillar.cls}`}>
            {pillar.emoji} {pillar.label}
          </span>
        )}
      </div>

      {post.title &&
        (href ? (
          <Link
            href={href}
            className="feed-post-title"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            {post.title}
          </Link>
        ) : (
          <div className="feed-post-title">{post.title}</div>
        ))}
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
        <button className="feed-post-action" type="button">
          💬 {post.commentCount} bình luận
        </button>
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
      </div>
    </article>
  );
}
