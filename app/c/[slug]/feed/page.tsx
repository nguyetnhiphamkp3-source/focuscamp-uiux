import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { getPillars, getCurrency } from "@/lib/community-config";
import { PostComposer } from "@/components/feed/post-composer";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pillar?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pillarFilter = sp.pillar;

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

  const posts = await listFeed({
    communityId: community.id,
    type: "POST",
    userId,
    pillar: pillarFilter || undefined,
    limit: 30,
  });

  return (
    <>
      <header className="view-header">
        <span className="view-title">Bảng tin</span>
        <span className="view-subtitle">Chia sẻ kinh nghiệm, ý tưởng, và insight</span>
      </header>
      <div className="feed-view">
        <div className="feed-inner">
          {isMember && session?.user && userId ? (
            <PostComposer
              communityId={community.id}
              communitySlug={slug}
              pillars={pillars}
              user={{
                id: userId,
                name: session.user.name ?? null,
                image: session.user.image ?? null,
              }}
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
                ? "Tham gia cộng đồng để đăng bài"
                : "Đăng nhập để tham gia và đăng bài"}
            </div>
          )}

          <div className="feed-tabs">
            <div className="feed-tab active">Latest</div>
            <div className="feed-tab" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              Popular
            </div>
            <div className="feed-tab" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              Following
            </div>
            <div className="feed-tab" style={{ opacity: 0.4, cursor: "not-allowed" }}>
              Bookmarked
            </div>
          </div>

          {pillars.length > 0 && (
            <div className="feed-pillars">
              <Link
                href={`/c/${slug}/feed`}
                className={`feed-pillar-pill ${!pillarFilter ? "active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                Tất cả
              </Link>
              {pillars.map((p) => (
                <Link
                  key={p.key}
                  href={`/c/${slug}/feed?pillar=${p.key}`}
                  className={`feed-pillar-pill ${pillarFilter === p.key ? "active" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  {p.emoji ? `${p.emoji} ` : ""}
                  {p.label}
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="Chưa có bài viết nào"
              description={
                isMember
                  ? "Hãy là người đầu tiên chia sẻ điều gì đó với cộng đồng!"
                  : "Đang chờ bài viết đầu tiên từ cộng đồng."
              }
            />
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                communitySlug={slug}
                pillars={pillars}
                currency={currency}
                canEditCot={isOwner}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
