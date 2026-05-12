import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { getPillars, getCurrency } from "@/lib/community-config";
import { PostComposer } from "@/components/feed/post-composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function QAPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { filter, sort: sortParam } = await searchParams;
  const sort: "latest" | "popular" = sortParam === "popular" ? "popular" : "latest";

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

  const pillars = getPillars(community);
  const currency = getCurrency(community);

  const session = await auth();
  const userId = session?.user?.id;
  const isOwner = userId === community.ownerId;

  const isMember = userId
    ? !!(await prisma.membership.findUnique({
        where: { userId_communityId: { userId, communityId: community.id } },
      }))
    : false;

  const PAGE_SIZE = 20;
  const questions = await listFeed({
    communityId: community.id,
    type: "QUESTION",
    userId,
    sort,
    limit: PAGE_SIZE,
  });

  const allCount = questions.length;
  const unanswered = questions.filter((q) => q.commentCount === 0);
  const displayedQuestions = filter === "unanswered" ? unanswered : questions;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Hỏi đáp</span>
        <span className="view-subtitle">
          Đặt câu hỏi, nhận câu trả lời từ cộng đồng
        </span>
      </header>
      <div className="feed-view">
        <div className="feed-inner">
          {isMember && session?.user && userId ? (
            <PostComposer
              communityId={community.id}
              communitySlug={slug}
              type="QUESTION"
              pillars={pillars}
              user={{
                id: userId,
                name: session.user.name ?? null,
                image: session.user.image ?? null,
              }}
              placeholder="Câu hỏi của bạn là gì? Nêu rõ bối cảnh để dễ trả lời hơn…"
              showTitle={true}
              showPillar={false}
            />
          ) : (
            <div
              className="feed-compose"
              style={{
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              {userId
                ? "Tham gia cộng đồng để đặt câu hỏi"
                : "Đăng nhập để đặt câu hỏi"}
            </div>
          )}

          {/* Tabs */}
          <div className="feed-tabs" style={{ marginBottom: 12 }}>
            <Link
              href={`/c/${slug}/qa`}
              scroll={false}
              className={`feed-tab${!filter || filter === "all" ? " active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Tất cả ({allCount})
            </Link>
            <Link
              href={`/c/${slug}/qa?filter=unanswered`}
              scroll={false}
              className={`feed-tab${filter === "unanswered" ? " active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Chưa trả lời ({unanswered.length})
            </Link>
            <Link
              href={`/c/${slug}/qa?sort=popular${filter ? `&filter=${filter}` : ""}`}
              scroll={false}
              className={`feed-tab${sort === "popular" ? " active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Hot nhất
            </Link>
          </div>

          {displayedQuestions.length === 0 ? (
            <EmptyState
              icon="❓"
              title={filter === "unanswered" ? "Không có câu hỏi chưa trả lời" : "Chưa có câu hỏi nào"}
              description={
                isMember
                  ? "Hãy là người đầu tiên đặt câu hỏi. Cộng đồng sẽ trả lời giúp bạn!"
                  : "Đang chờ câu hỏi đầu tiên."
              }
            />
          ) : (
            <FeedList
              initialPosts={displayedQuestions}
              communityId={community.id}
              communitySlug={slug}
              type="QUESTION"
              pillars={pillars}
              currency={currency}
              isOwner={isOwner}
              currentUserId={userId ?? null}
              pageSize={PAGE_SIZE}
            />
          )}
        </div>
      </div>
    </>
  );
}
