import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { getPillars, getCurrency } from "@/lib/community-config";
import { PostComposer } from "@/components/feed/post-composer";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/ui/empty-state";
import { followedUserIds } from "@/lib/services/follow";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pillar?: string; sort?: string; scope?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const pillarFilter = sp.pillar;
  const sort: "latest" | "popular" =
    sp.sort === "popular" ? "popular" : "latest";
  const scope: "all" | "following" | "bookmarked" =
    sp.scope === "following"
      ? "following"
      : sp.scope === "bookmarked"
        ? "bookmarked"
        : "all";

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
  const realIsOwner = userId === community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);

  const membership = userId
    ? await prisma.membership.findUnique({
        where: { userId_communityId: { userId, communityId: community.id } },
        select: { role: true },
      })
    : null;
  const isMember = !!membership;
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: membership?.role,
  });
  const permissions = communityPermissionFlags(role);

  const PAGE_SIZE = 20;

  // Scope-specific precomputed lists
  let followedIds: string[] | undefined;
  let bookmarkedIds: string[] | undefined;
  if (userId && scope === "following") {
    followedIds = await followedUserIds(userId);
  } else if (userId && scope === "bookmarked") {
    const rows = await prisma.bookmark.findMany({
      where: { userId, post: { communityId: community.id } },
      select: { postId: true },
    });
    bookmarkedIds = rows.map((r) => r.postId);
  }

  const posts = await listFeed({
    communityId: community.id,
    type: "POST",
    userId,
    pillar: pillarFilter || undefined,
    sort,
    scope,
    followedUserIds: followedIds,
    bookmarkedPostIds: bookmarkedIds,
    limit: PAGE_SIZE,
  });

  // Preserve pillar+sort+scope across tab/filter switches
  function urlFor(overrides: {
    pillar?: string | null;
    sort?: string;
    scope?: string;
  }) {
    const p = new URLSearchParams();
    const finalPillar =
      overrides.pillar === null
        ? undefined
        : overrides.pillar ?? pillarFilter;
    const finalSort = overrides.sort ?? (sort === "latest" ? undefined : sort);
    const finalScope =
      overrides.scope ?? (scope === "all" ? undefined : scope);
    if (finalPillar) p.set("pillar", finalPillar);
    if (finalSort) p.set("sort", finalSort);
    if (finalScope) p.set("scope", finalScope);
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
              href={urlFor({ sort: "", scope: "" })}
              scroll={false}
              className={`feed-tab ${sort === "latest" && scope === "all" ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Latest
            </Link>
            <Link
              href={urlFor({ sort: "popular", scope: "" })}
              scroll={false}
              className={`feed-tab ${sort === "popular" && scope === "all" ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              Popular
            </Link>
            {userId ? (
              <>
                <Link
                  href={urlFor({ scope: "following" })}
                  scroll={false}
                  className={`feed-tab ${scope === "following" ? "active" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  Following
                </Link>
                <Link
                  href={urlFor({ scope: "bookmarked" })}
                  scroll={false}
                  className={`feed-tab ${scope === "bookmarked" ? "active" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  Bookmarked
                </Link>
              </>
            ) : (
              <>
                <div
                  className="feed-tab"
                  title="Đăng nhập để follow người khác"
                  style={{ opacity: 0.4, cursor: "not-allowed" }}
                >
                  Following
                </div>
                <div
                  className="feed-tab"
                  title="Đăng nhập để bookmark bài"
                  style={{ opacity: 0.4, cursor: "not-allowed" }}
                >
                  Bookmarked
                </div>
              </>
            )}
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
            <FeedList
              initialPosts={posts}
              communityId={community.id}
              communitySlug={slug}
              type="POST"
              pillars={pillars}
              currency={currency}
              isOwner={permissions.canModerateContent}
              currentUserId={userId ?? null}
              pageSize={PAGE_SIZE}
              filter={{
                pillar: pillarFilter,
                sort,
                scope,
                followedUserIds: followedIds,
                bookmarkedPostIds: bookmarkedIds,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
