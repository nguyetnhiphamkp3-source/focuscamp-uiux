import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";
import { BRAND_GRADIENTS as BANNER_GRADIENTS, initials } from "@/lib/brand";

export const dynamic = "force-dynamic";

const DISCOVERY_PAGE_SIZE = 9;
const VERIFIED_COMMUNITY_SLUGS = ["the-all-in-plan"] as const;
const VERIFIED_COMMUNITY_SLUG_SET = new Set<string>(VERIFIED_COMMUNITY_SLUGS);
const COMMUNITY_LIST_ORDER = [
  { memberships: { _count: "desc" } },
  { createdAt: "desc" },
] satisfies Prisma.CommunityOrderByWithRelationInput[];

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    section?: string;
    communityPage?: string;
    challengePage?: string;
  }>;
}) {
  const {
    q: rawQ,
    section: sectionParam,
    communityPage: rawCommunityPage,
    challengePage: rawChallengePage,
  } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const section =
    sectionParam === "communities" || sectionParam === "challenges"
      ? sectionParam
      : null;
  const requestedCommunityPage = parsePage(rawCommunityPage);
  const requestedChallengePage = parsePage(rawChallengePage);

  function discoveryHref({
    communityPage = requestedCommunityPage,
    challengePage = requestedChallengePage,
    nextSection = section,
    hash,
  }: {
    communityPage?: number;
    challengePage?: number;
    nextSection?: typeof section;
    hash?: string;
  }) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (communityPage > 1) sp.set("communityPage", String(communityPage));
    if (challengePage > 1) sp.set("challengePage", String(challengePage));
    if (nextSection) sp.set("section", nextSection);
    const qs = sp.toString();
    return `/discovery${qs ? `?${qs}` : ""}${hash ? `#${hash}` : ""}`;
  }

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
  };
  const verifiedCommunityWhere: Prisma.CommunityWhereInput = {
    AND: [
      communityWhere,
      {
        OR: [
          { featuredOnGlobal: true },
          { slug: { in: [...VERIFIED_COMMUNITY_SLUGS] } },
        ],
      },
    ],
  };
  const unverifiedCommunityWhere: Prisma.CommunityWhereInput = {
    AND: [
      communityWhere,
      { featuredOnGlobal: false },
      { NOT: { slug: { in: [...VERIFIED_COMMUNITY_SLUGS] } } },
    ],
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

  const [
    verifiedCommunityCount,
    communityListingCount,
    featuredChallengeCount,
    latestChallengeCount,
    totals,
  ] = await Promise.all([
    prisma.community.count({ where: verifiedCommunityWhere }),
    prisma.community.count({ where: communityWhere }),
    prisma.challenge.count({ where: featuredChallengeWhere }),
    prisma.challenge.count({ where: challengeWhere }),
    prisma.$transaction([
      prisma.community.count(),
      prisma.challenge.count({ where: { status: { in: ["OPEN", "ACTIVE"] } } }),
      prisma.user.count(),
      prisma.product.count(),
    ]),
  ]);

  const showingLatestChallenges =
    featuredChallengeCount === 0 && latestChallengeCount > 0;
  const effectiveChallengeWhere = showingLatestChallenges
    ? challengeWhere
    : featuredChallengeWhere;
  const challengeListingCount = showingLatestChallenges
    ? latestChallengeCount
    : featuredChallengeCount;
  const communityTotalPages = getTotalPages(communityListingCount);
  const challengeTotalPages = getTotalPages(challengeListingCount);
  const communityPage = clampPage(requestedCommunityPage, communityTotalPages);
  const challengePage = clampPage(requestedChallengePage, challengeTotalPages);

  const [communities, challenges] = await Promise.all([
    getCommunityPage({
      page: communityPage,
      verifiedCount: verifiedCommunityCount,
      verifiedCommunityWhere,
      unverifiedCommunityWhere,
    }),
    prisma.challenge.findMany({
      take: DISCOVERY_PAGE_SIZE,
      skip: (challengePage - 1) * DISCOVERY_PAGE_SIZE,
      where: effectiveChallengeWhere,
      orderBy: { createdAt: "desc" },
      include: {
        community: { select: { name: true, slug: true } },
        _count: { select: { members: true } },
      },
    }),
  ]);

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

        {/* Communities */}
        <div className="dc-section-head" id="featured-communities">
          <h2>🌟 Communities</h2>
          <span className="dc-section-count">
            {communityListingCount.toLocaleString("vi-VN")} communities
          </span>
        </div>

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
          <>
            <div className="dc-communities-grid">
              {communities.map((c, idx) => {
                const verified = isVerifiedCommunity(c);
                const badge = verified
                  ? "verified"
                  : c._count.memberships >= 100
                    ? "hot"
                    : "new";
                const badgeLabel = verified
                  ? "✓ Verified"
                  : c._count.memberships >= 100
                    ? "🔥 Hot"
                    : "NEW";
                return (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}`}
                    className="dc-community"
                  >
                    <div
                      className="dc-community-banner"
                      style={{
                        background: c.bannerUrl
                          ? `url(${c.bannerUrl}) center/cover no-repeat`
                          : BANNER_GRADIENTS[idx % BANNER_GRADIENTS.length],
                      }}
                    >
                      {!c.bannerUrl && initials(c.name)}
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
            <Pagination
              ariaLabel="Featured Communities pagination"
              page={communityPage}
              totalPages={communityTotalPages}
              hrefForPage={(page) =>
                discoveryHref({
                  communityPage: page,
                  challengePage,
                  nextSection: "communities",
                  hash: "featured-communities",
                })
              }
            />
          </>
        )}

        {/* Featured challenges */}
        {challenges.length > 0 && (
          <>
            <div className="dc-section-head" id="featured-challenges">
              <h2>⚔️ Featured Challenges</h2>
              <span className="dc-section-count">
                {challengeListingCount.toLocaleString("vi-VN")} challenges
              </span>
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
                    <div
                      className={`ch-card-banner ${diff}`}
                      style={ch.bannerUrl ? { background: `url(${ch.bannerUrl}) center/cover no-repeat` } : undefined}
                    >
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
            <Pagination
              ariaLabel="Featured Challenges pagination"
              page={challengePage}
              totalPages={challengeTotalPages}
              hrefForPage={(page) =>
                discoveryHref({
                  communityPage,
                  challengePage: page,
                  nextSection: "challenges",
                  hash: "featured-challenges",
                })
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

async function getCommunityPage({
  page,
  verifiedCount,
  verifiedCommunityWhere,
  unverifiedCommunityWhere,
}: {
  page: number;
  verifiedCount: number;
  verifiedCommunityWhere: Prisma.CommunityWhereInput;
  unverifiedCommunityWhere: Prisma.CommunityWhereInput;
}) {
  const start = (page - 1) * DISCOVERY_PAGE_SIZE;

  const verifiedCommunities = await prisma.community.findMany({
    take: DISCOVERY_PAGE_SIZE,
    skip: Math.min(start, verifiedCount),
    where: verifiedCommunityWhere,
    orderBy: COMMUNITY_LIST_ORDER,
    include: communityCardInclude,
  });
  const remaining = DISCOVERY_PAGE_SIZE - verifiedCommunities.length;
  if (remaining <= 0) return verifiedCommunities;

  const unverifiedCommunities = await prisma.community.findMany({
    take: remaining,
    skip: Math.max(0, start - verifiedCount),
    where: unverifiedCommunityWhere,
    orderBy: COMMUNITY_LIST_ORDER,
    include: communityCardInclude,
  });

  return [...verifiedCommunities, ...unverifiedCommunities];
}

const communityCardInclude = {
  _count: { select: { memberships: true, challenges: true, courses: true } },
} satisfies Prisma.CommunityInclude;

function isVerifiedCommunity(community: {
  slug: string;
  featuredOnGlobal: boolean;
}) {
  return (
    community.featuredOnGlobal || VERIFIED_COMMUNITY_SLUG_SET.has(community.slug)
  );
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function getTotalPages(count: number) {
  return Math.max(1, Math.ceil(count / DISCOVERY_PAGE_SIZE));
}

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), totalPages);
}

function Pagination({
  ariaLabel,
  page,
  totalPages,
  hrefForPage,
}: {
  ariaLabel: string;
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav className="dc-pagination" aria-label={ariaLabel}>
      {page > 1 ? (
        <Link className="dc-page-link" href={hrefForPage(page - 1)}>
          ←
        </Link>
      ) : (
        <span className="dc-page-link disabled">←</span>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          className={`dc-page-link${p === page ? " active" : ""}`}
          href={hrefForPage(p)}
          aria-current={p === page ? "page" : undefined}
        >
          {p}
        </Link>
      ))}
      {page < totalPages ? (
        <Link className="dc-page-link" href={hrefForPage(page + 1)}>
          →
        </Link>
      ) : (
        <span className="dc-page-link disabled">→</span>
      )}
    </nav>
  );
}

function pageWindow(page: number, totalPages: number) {
  const size = Math.min(5, totalPages);
  const start = Math.min(Math.max(page - 2, 1), totalPages - size + 1);
  return Array.from({ length: size }, (_, idx) => start + idx);
}
