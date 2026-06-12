import { Star, MessageCircle } from "lucide-react";
import { avatarColorFor, nameColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import { pillarByKey } from "@/lib/community-config";
import { ReactionButton } from "@/components/feed/reaction-button";
import { PostMenu } from "@/components/feed/post-menu";
import { PostImageLightbox } from "@/components/feed/post-image-lightbox";
import { CommentComposer } from "@/components/feed/comment-composer";
import { CommentItem } from "@/components/feed/comment-item";
import type { CommentItemData } from "@/components/feed/comment-item";
import { LinkifiedText } from "@/components/shared/linkified-text";
import { EmptyState } from "@/components/ui/empty-state";
import type { PostDetailData } from "@/lib/feed-detail";

/** Flatten comments into root → all-descendants tree (CommentItem recurses). */
function groupByParent(
  comments: CommentItemData[]
): (CommentItemData & { replies: CommentItemData[] })[] {
  const byParent = new Map<string, CommentItemData[]>();
  for (const c of comments) {
    const key = c.parentId ?? "__root__";
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  function childrenOf(parentId: string): CommentItemData[] {
    const direct = byParent.get(parentId) ?? [];
    const out: CommentItemData[] = [];
    for (const c of direct) {
      out.push(c);
      out.push(...childrenOf(c.id));
    }
    return out;
  }
  return (byParent.get("__root__") ?? []).map((r) => ({ ...r, replies: childrenOf(r.id) }));
}

/** Renders a post + its comments + composer. Used by the detail page and the modal. */
export function PostDetailView({ data }: { data: PostDetailData }) {
  const { slug, post, comments, currency, pillars, permissions, isAuthor, isMember, userId, sessionUser } = data;
  const pillar = pillarByKey(post.pillar, pillars);
  const authorName = post.user.name || "Ẩn danh";
  const isQuestion = post.type === "QUESTION";

  return (
    <>
      <article className={`feed-post${post.isCot ? " cot-post" : ""}`} style={{ marginBottom: 0 }}>
        <div className="feed-post-head">
          <span style={{ flexShrink: 0, lineHeight: 0 }}>
            {post.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.user.image} alt="" className="feed-post-avatar" style={{ objectFit: "cover" }} />
            ) : (
              <div className="feed-post-avatar" style={{ background: avatarColorFor(post.user.id) }}>
                {initials(authorName)}
              </div>
            )}
          </span>
          <div className="feed-post-author-wrap">
            <div className="feed-post-author">
              <span style={{ color: nameColorFor(post.user.id) }}>{authorName}</span>
            </div>
            <div className="feed-post-time">
              {fmtRelativeTime(post.createdAt)}
              {post.isCot && (
                <>
                  {" · "}
                  <span style={{ color: "var(--premium-gold)", fontWeight: 700 }}>
                    <Star size={11} fill="currentColor" style={{ verticalAlign: "-1px" }} /> CỐT
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
          <h1 className="feed-post-title" style={{ fontSize: "var(--text-xl)", marginBottom: 16 }}>
            {post.title}
          </h1>
        )}
        <div className="feed-post-body" style={{ whiteSpace: "pre-wrap", fontSize: "var(--text-md)", lineHeight: 1.6 }}>
          <LinkifiedText>{post.body}</LinkifiedText>
        </div>
        {post.imageUrl && <PostImageLightbox src={post.imageUrl} />}

        <div className="feed-post-actions">
          <ReactionButton postId={post.id} communitySlug={slug} initialCount={post.reactionCount} initialReacted={post.reactedByMe} />
          <span className="feed-post-action" style={{ cursor: "default" }}>
            <MessageCircle size={16} /> {post.commentCount} bình luận
          </span>
          <div style={{ marginLeft: "auto" }}>
            <PostMenu
              postId={post.id}
              communitySlug={slug}
              canEdit={isAuthor}
              canDelete={isAuthor || permissions.canModerateContent}
              canManagePostActions={permissions.canModerateContent}
              canReport={!!userId && !isAuthor && isMember}
              initialIsPinned={post.isPinned}
              initialIsCot={post.isCot}
              redirectOnDelete={true}
              initial={{ title: post.title, body: post.body, pillar: post.pillar, imageUrl: post.imageUrl }}
              pillars={pillars}
            />
          </div>
        </div>
      </article>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 700, marginBottom: 16, color: "var(--header-primary)" }}>
          {isQuestion ? "Câu trả lời" : "Bình luận"} ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <EmptyState
            icon="💬"
            title={isQuestion ? "Chưa có câu trả lời" : "Chưa có bình luận"}
            description={
              isMember
                ? isQuestion
                  ? "Giúp tác giả trả lời câu hỏi này bên dưới."
                  : "Hãy là người đầu tiên bình luận."
                : "Đăng nhập + tham gia cộng đồng để bình luận."
            }
          />
        ) : (
          groupByParent(comments).map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={c.replies}
              postId={post.id}
              communitySlug={slug}
              currentUser={isMember && sessionUser ? sessionUser : null}
              isOwner={permissions.canModerateContent}
              postAuthorId={post.user.id}
              isQuestion={isQuestion}
            />
          ))
        )}

        {isMember && sessionUser && (
          <CommentComposer
            postId={post.id}
            communitySlug={slug}
            user={sessionUser}
            placeholder={isQuestion ? "Viết câu trả lời của bạn…" : "Viết bình luận…"}
          />
        )}
      </div>
    </>
  );
}
