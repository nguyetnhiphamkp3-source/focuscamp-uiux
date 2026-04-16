import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPostWithComments } from "@/lib/services/post";
import {
  getPillars,
  getCurrency,
  pillarByKey,
} from "@/lib/community-config";
import {
  avatarColorFor,
  nameColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";
import { ReactionButton } from "@/components/feed/reaction-button";
import { CotToggleButton } from "@/components/feed/cot-toggle-button";
import { CommentComposer } from "@/components/feed/comment-composer";
import { CommentItem } from "@/components/feed/comment-item";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      ownerId: true,
      pillarsConfig: true,
      gemsConfig: true,
    },
  });
  if (!community) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const data = await getPostWithComments(postId, userId);
  if (!data || data.post.community.id !== community.id) notFound();

  const { post, comments } = data;
  const pillars = getPillars(community);
  const currency = getCurrency(community);
  const pillar = pillarByKey(post.pillar, pillars);

  const isOwner = userId === community.ownerId;
  const isAuthor = userId === post.user.id;
  const isMember = userId
    ? !!(await prisma.membership.findUnique({
        where: {
          userId_communityId: { userId, communityId: community.id },
        },
      }))
    : false;

  const authorName = post.user.name || "Ẩn danh";
  const isQuestion = post.type === "QUESTION";
  const backHref = isQuestion
    ? `/c/${slug}/qa`
    : post.type === "SIGNAL"
      ? `/c/${slug}/signals`
      : `/c/${slug}/feed`;

  return (
    <>
      <header className="view-header">
        <Link
          href={backHref}
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--interactive-normal)",
            textDecoration: "none",
          }}
        >
          ← Quay lại
        </Link>
        <span className="view-title" style={{ marginLeft: 12 }}>
          {isQuestion ? "Câu hỏi" : post.type === "SIGNAL" ? "Tín hiệu" : "Bài viết"}
        </span>
      </header>

      <div className="feed-view">
        <div className="feed-inner">
          <article
            className={`feed-post${post.isCot ? " cot-post" : ""}`}
            style={{ marginBottom: 0 }}
          >
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
                  <span style={{ color: nameColorFor(post.user.id) }}>
                    {authorName}
                  </span>
                </div>
                <div className="feed-post-time">
                  {fmtRelativeTime(post.createdAt)}
                  {post.isCot && (
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
                  {" · "}
                  <span>{post.viewCount + 1} lượt xem</span>
                </div>
              </div>
              {pillar && (
                <span
                  className={`feed-post-pillar-tag${pillar.cssClass ? ` ${pillar.cssClass}` : ""}`}
                  style={
                    pillar.color
                      ? { borderColor: pillar.color, color: pillar.color }
                      : undefined
                  }
                >
                  {pillar.emoji ? `${pillar.emoji} ` : ""}
                  {pillar.label}
                </span>
              )}
            </div>

            {post.title && (
              <h1
                className="feed-post-title"
                style={{ fontSize: "var(--text-2xl)", marginBottom: 16 }}
              >
                {post.title}
              </h1>
            )}
            <div
              className="feed-post-body"
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "var(--text-md)",
                lineHeight: 1.6,
              }}
            >
              {post.body}
            </div>

            <div className="feed-post-actions">
              <ReactionButton
                postId={post.id}
                communitySlug={slug}
                initialCount={post.reactionCount}
                initialReacted={post.reactedByMe}
              />
              <span className="feed-post-action" style={{ cursor: "default" }}>
                💬 {post.commentCount} bình luận
              </span>
              {isOwner && (
                <CotToggleButton
                  postId={post.id}
                  communitySlug={slug}
                  initialIsCot={post.isCot}
                />
              )}
            </div>
          </article>

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <h2
              style={{
                fontSize: "var(--text-lg)",
                fontWeight: 700,
                marginBottom: 16,
                color: "var(--header-primary)",
              }}
            >
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
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  postId={post.id}
                  communitySlug={slug}
                  canMarkBest={isAuthor || isOwner}
                  canDelete={userId === c.user.id || isOwner}
                  isQuestion={isQuestion}
                />
              ))
            )}

            {isMember && session?.user && userId && (
              <CommentComposer
                postId={post.id}
                communitySlug={slug}
                user={{
                  id: userId,
                  name: session.user.name ?? null,
                  image: session.user.image ?? null,
                }}
                placeholder={
                  isQuestion ? "Viết câu trả lời của bạn…" : "Viết bình luận…"
                }
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
