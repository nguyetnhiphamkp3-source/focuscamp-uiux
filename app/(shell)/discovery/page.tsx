import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";
import { isCommunityCategory } from "@/lib/community-categories";
import { BRAND_GRADIENTS as BANNER_GRADIENTS, initials } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; section?: string }>;
}) {
  const { q: rawQ, category: rawCategory, section: sectionParam } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const category = isCommunityCategory(rawCategory) ? rawCategory : null;
  const section =
    sectionParam === "communities" || sectionParam === "challenges"
      ? sectionParam
      : null;
  const showAllCommunities = section === "communities";
  const showAllChallenges = section === "challenges";

  function discoveryHref(nextSection: typeof section, hash?: string) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (nextSection) sp.set("section", nextSection);
    const qs = sp.toString();
    return `/discovery${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
  }

  const communityTake = showAllCommunities ? 60 : 24;
  const challengeTake = showAllChallenges ? 24 : 6;

  const communityWhere: Prisma.CommunityWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { tagline: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(category ? { category } : {}),
  };
  const featuredCommunityWhere: Prisma.CommunityWhereInput = {
    ...communityWhere,
    featuredOnGlobal: true,
  };

  const challengeWhere: Prisma.ChallengeWhereInput = {
    status: { in: ["OPEN", "ACTIVE"] as string[] },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const featuredChallengeWhere: Prisma.ChallengeWhereInput = {
    ...challengeWhere,
    featuredOnGlobal: true,
  };

  const [featuredCommunities, featuredChallenges, totals] = await Promise.all([
    prisma.community.findMany({
      take: communityTake,
      where: featuredCommunityWhere,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, challenges: true, courses: true } },
      },
    }),
    prisma.challenge.findMany({
      take: challengeTake,
      where: featuredChallengeWhere,
      orderBy: { createdAt: "desc" },
      include: {
        community: { select: { name: true, slug: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.$transaction([
      prisma.community.count(),
      prisma.challenge.count({ where: { status: { in: ["OPEN", "ACTIVE"] } } }),
      prisma.user.count(),
      prisma.product.count(),
    ]),
  ]);

  let communities = featuredCommunities;
  let showingLatestCommunities = false;
  if (communities.length === 0) {
    communities = await prisma.community.findMany({
      take: communityTake,
      where: communityWhere,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, challenges: true, courses: true } },
      },
    });
    showingLatestCommunities = communities.length > 0;
  }

  let challenges = featuredChallenges;
  let showingLatestChallenges = false;
  if (challenges.length === 0) {
    challenges = await prisma.challenge.findMany({
      take: challengeTake,
      where: challengeWhere,
      orderBy: { createdAt: "desc" },
      include: {
        community: { select: { name: true, slug: true } },
        _count: { select: { members: true } },
      },
    });
    showingLatestChallenges = challenges.length > 0;
  }

  const [communityCount, challengeCount, memberCount, productCount] = totals;

  return (
    <div className="dc-view" style={{ minHeight: 0, flex: 1, overflowY: "auto" }}>
      <div className="dc-inner">
        {/* Hero */}
        <section className="dc-hero">
          <div className="dc-hero-left">
            <div className="dc-hero-title">🔭 Discover — Cross-community marketplace</div>
            <div className="dc-hero-desc">
              Tìm cộng đồng phù hợp, tham gia challenge mới, mua products độc quyền từ
              creators trên toàn focus.camp — một cửa sổ duy nhất.
            </div>
          </div>
          <div className="dc-hero-stats">
            <div className="dc-hero-stat">
              <strong>{communityCount.toLocaleString("vi-VN")}</strong>
              <span>Communities</span>
            </div>
            <div className="dc-hero-stat">
              <strong>{productCount.toLocaleString("vi-VN")}</strong>
              <span>Products</span>
            </div>
            <div className="dc-hero-stat">
              <strong>{challengeCount.toLocaleString("vi-VN")}</strong>
              <span>Active challenges</span>
            </div>
            <div className="dc-hero-stat">
              <strong>{memberCount.toLocaleString("vi-VN")}</strong>
              <span>Active members</span>
            </div>
          </div>
        </section>

        <DiscoveryFilters />

        {/* Featured communities */}
        <div className="dc-section-head">
          <h2>🌟 Featured Communities</h2>
          <Link
            href={discoveryHref(showAllCommunities ? null : "communities")}
            className="see-all"
          >
            {showAllCommunities ? "Thu gọn communities ↑" : "Xem tất cả communities →"}
          </Link>
        </div>

        {showingLatestCommunities && (
          <div
            style={{
              marginTop: "-8px",
              marginBottom: 12,
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            Đang hiển thị cộng đồng mới nhất vì chưa có Featured Communities phù hợp.
          </div>
        )}

        {communities.length === 0 ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: "var(--text-3xl)", marginBottom: 8 }}>🏜️</div>
            Chưa có community nào.
          </div>
        ) : (
          <div className="dc-communities-grid">
            {communities.map((c, idx) => {
              const badge =
                c._count.memberships >= 100
                  ? "hot"
                  : idx < 2
                    ? "verified"
                    : "new";
              const badgeLabel =
                badge === "hot" ? "🔥 Hot" : badge === "verified" ? "✓ Verified" : "NEW";
              return (
                <Link
                  key={c.id}
                  href={`/c/${c.slug}`}
                  className="dc-community"
                >
                  <div
                    className="dc-community-banner"
                    style={{ background: BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length] }}
                  >
                    {initials(c.name)}
                    <span className={`dc-community-badge ${badge}`}>{badgeLabel}</span>
                  </div>
                  <div className="dc-community-body">
                    <div className="dc-community-name">{c.name}</div>
                    <div className="dc-community-desc">
                      {c.tagline || c.description || "Community trên focus.camp."}
                    </div>
                    <div className="dc-community-stats">
                      <span className="dot" />
                      <span>
                        <strong>{c.onlineCount}</strong> online
                      </span>
                      <span className="sep">·</span>
                      <span>
                        <strong>{c._count.memberships}</strong> members
                      </span>
                      <span className="sep">·</span>
                      <span>
                        <strong>{c._count.challenges}</strong> challenges
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Featured challenges */}
        {challenges.length > 0 && (
          <>
            <div className="dc-section-head" id="featured-challenges">
              <h2>⚔️ Featured Challenges</h2>
              <Link
                href={discoveryHref(
                  showAllChallenges ? null : "challenges",
                  "featured-challenges"
                )}
                className="see-all"
              >
                {showAllChallenges ? "Thu gọn challenges ↑" : "Xem tất cả challenges →"}
              </Link>
            </div>
            {showingLatestChallenges && (
              <div
                style={{
                  marginTop: "-8px",
                  marginBottom: 12,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                }}
              >
                Đang hiển thị challenge mới nhất vì chưa có Featured Challenges phù hợp.
              </div>
            )}
            <div className="ch-grid">
              {challenges.map((ch) => {
                const diff =
                  ch.difficulty === "HARD"
                    ? "diff-hard"
                    : ch.difficulty === "CHAOS"
                      ? "diff-chaos"
                      : "diff-normal";
                const diffLabel =
                  ch.difficulty === "HARD"
                    ? "⚔️ Hard"
                    : ch.difficulty === "CHAOS"
                      ? "🔥 Chaos"
                      : "🛡️ Normal";
                const statusClass = ch.status === "ACTIVE" ? "active" : "open";
                return (
                  <Link
                    key={ch.id}
                    href={`/c/${ch.community.slug}/challenges/${ch.slug}`}
                    className="ch-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className={`ch-card-banner ${diff}`}>
                      <span className="ch-diff-badge">{diffLabel}</span>
                      <span className={`ch-status-badge ${statusClass}`}>
                        {ch.status}
                      </span>
                      <div className="ch-card-banner-title">{ch.title}</div>
                    </div>
                    <div className="ch-card-body">
                      <div className="ch-card-desc">
                        {ch.description || "Challenge trong focus.camp."}
                      </div>
                      <div className="ch-card-meta">
                        <span style={{ fontSize: "var(--text-xs)" }}>bởi</span>
                        <span style={{ fontWeight: 600, color: "var(--text-heading)" }}>
                          {ch.community.name}
                        </span>
                        <span className="meta-sep">·</span>
                        <span>{ch._count.members} joined</span>
                      </div>
                      <span className="ch-card-cta primary">Khám phá</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
