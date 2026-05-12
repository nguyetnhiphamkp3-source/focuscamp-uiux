import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DiscoveryFilters } from "@/components/discovery/discovery-filters";

export const dynamic = "force-dynamic";

import { BRAND_GRADIENTS as BANNER_GRADIENTS, initials } from "@/lib/brand";

export default async function DiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const communityWhere = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { tagline: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(category && category !== "Tất cả" ? { category } : {}),
  };

  const challengeWhere = {
    status: { in: ["OPEN", "ACTIVE"] as string[] },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [communities, challenges, totals] = await Promise.all([
    prisma.community.findMany({
      take: 24,
      where: communityWhere,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, challenges: true, courses: true } },
      },
    }),
    prisma.challenge.findMany({
      take: 6,
      where: challengeWhere,
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
          <span className="see-all">Xem tất cả →</span>
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

        {/* Trending Challenges */}
        {challenges.length > 0 && (
          <>
            <div className="dc-section-head">
              <h2>⚔️ Trending Challenges</h2>
              <span className="see-all">Xem tất cả →</span>
            </div>
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
