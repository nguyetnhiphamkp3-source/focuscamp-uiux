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
  searchParams: Promise<{ pillar?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pillarFilter = sp.pillar;
  const sort: "latest" | "popular" =
    sp.sort === "popular" ? "popular" : "latest";

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
    sort,
    limit: 30,
  });

  // Preserve pillar across tab switches, and sort across pillar switches
  function urlFor(overrides: { pillar?: string | null; sort?: string }) {
    const p = new URLSearchParams();
    const finalPillar =
      overrides.pillar === null
        ? undefined
        : overrides.pillar ?? pillarFilter;
    const finalSort = overrides.sort ?? (sort === "latest" ? undefined : sort);
    if (finalPillar) p.set("pillar", finalPillar);
    if (finalSort) p.set("sort", finalSort);
    const qs = p.toString();
    return `/c/${slug}/feed${qs ? `?${qs}` : ""}`;
  }

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
            <Link
              href={urlFor({ sort: "" })}
              scroll={false}
              className={`feed-tab ${sort === "latest" ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Latest
            </Link>
            <Link
              href={urlFor({ sort: "popular" })}
              scroll={false}
              className={`feed-tab ${sort === "popular" ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Popular
            </Link>
            <div
              className="feed-tab"
              title="Phase 2 — cần Follow system"
              style={{ opacity: 0.4, cursor: "not-allowed" }}
            >
              Following
            </div>
            <div
              className="feed-tab"
              title="Phase 2 — cần Bookmark model"
              style={{ opacity: 0.4, cursor: "not-allowed" }}
            >
              Bookmarked
            </div>
          </div>

          {pillars.length > 0 && (
            <div className="feed-pillars">
              <Link
                href={urlFor({ pillar: null })}
                className={`feed-pillar-pill ${!pillarFilter ? "active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                Tất cả
              </Link>
              {pillars.map((p) => (
                <Link
                  key={p.key}
                  href={urlFor({ pillar: p.key })}
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
                currentUserId={userId ?? null}
                isOwner={isOwner}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
