import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ProductCard, fmtVnd } from "@/components/marketplace/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateProductButton } from "@/components/community/create-product-button";
import { FeaturedGlobalToggle } from "@/components/marketplace/featured-global-toggle";
import { MarketplaceFilters } from "@/components/community/marketplace-filters";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type } = await searchParams;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, _count: { select: { products: true } } },
  });
  if (!community) notFound();
  const isOwner = session?.user?.id === community.ownerId;

  const productWhere: Record<string, unknown> = { communityId: community.id };
  if (type === "FREE") {
    productWhere.isFree = true;
  } else if (type) {
    productWhere.type = type;
  }

  const [products, allProducts, paidChallenges] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { communityId: community.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.challenge.findMany({
      where: {
        communityId: community.id,
        status: { in: ["OPEN", "ACTIVE"] },
        NOT: [{ pricingConfig: { equals: Prisma.DbNull } }],
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  // Check which paid challenges the current user already joined
  const joinedChallengeIds = new Set<string>();
  if (session?.user?.id && paidChallenges.length > 0) {
    const joined = await prisma.challengeMember.findMany({
      where: {
        userId: session.user.id,
        challengeId: { in: paidChallenges.map((c) => c.id) },
        status: { in: ["ACTIVE", "COMPLETED", "PENDING"] },
      },
      select: { challengeId: true },
    });
    joined.forEach((j) => joinedChallengeIds.add(j.challengeId));
  }

  const featured = allProducts.slice(0, 5);

  const totalSales = allProducts.reduce((s, p) => s + p.soldCount, 0);
  const totalVolume = allProducts.reduce(
    (s, p) => s + Number(p.priceVnd) * p.soldCount,
    0
  );

  return (
    <>
      <header className="view-header">
        <span className="view-title">Marketplace</span>
        <span className="view-subtitle">
          Item shop — power-ups cho challenge của bạn
        </span>
      </header>

      <div className="mk-view">
        <div className="mk-inner">
          {isOwner && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "var(--space-4)",
              }}
            >
              <CreateProductButton
                communityId={community.id}
                communitySlug={slug}
              />
            </div>
          )}
          {/* Hero */}
          <div className="mk-hero">
            <div className="mk-hero-emoji">🛒</div>
            <div className="mk-hero-text">
              <div className="mk-hero-title">Item Shop</div>
              <div className="mk-hero-desc">
                Mua templates, SOP packs, tools, prompt — những power-up cần
                thiết để hoàn thành các challenge &amp; lên level nhanh hơn.
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mk-stats">
            <StatCard
              icon="📦"
              label="Items"
              value={String(community._count.products)}
              sub="trong shop"
            />
            <StatCard
              icon="🛍️"
              label="Purchases"
              value={fmtVnd(totalSales)}
              sub="đơn"
            />
            <StatCard
              icon="💰"
              label="Volume"
              value={`${fmtVnd(totalVolume)}đ`}
              sub="doanh thu"
            />
            <StatCard
              icon="✨"
              label="Featured"
              value={String(featured.length)}
              sub="trending"
            />
          </div>

          {/* Featured carousel */}
          {featured.length > 0 && (
            <>
              <div className="mk-section-head">
                <h2>🔥 Featured — Trending tuần này</h2>
              </div>
              <div className="mk-carousel-wrap">
                <div className="mk-carousel">
                  {featured.map((p, idx) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      communitySlug={slug}
                      idx={idx}
                      featured
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Paid Challenges */}
          {paidChallenges.length > 0 && (
            <>
              <div className="mk-section-head">
                <h2>⚔️ Challenges</h2>
              </div>
              <div className="mk-grid" style={{ marginBottom: "var(--space-6)" }}>
                {paidChallenges.map((c) => {
                  const cfg = c.pricingConfig as { guestVnd?: number; memberVnd?: number } | null;
                  const price = cfg?.guestVnd ?? 0;
                  const isJoined = joinedChallengeIds.has(c.id);
                  const diffColor = c.difficulty === "HARD" ? "#c97a3f" : c.difficulty === "CHAOS" ? "#b8455a" : "#3a8a70";
                  const diffLabel = c.difficulty === "HARD" ? "⚔️ Hard" : c.difficulty === "CHAOS" ? "🔥 Chaos" : "🛡️ Normal";
                  return (
                    <Link
                      key={c.id}
                      href={`/c/${slug}/challenges/${c.slug}`}
                      className="mk-card"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div
                        className="mk-card-thumb"
                        style={{
                          background: c.bannerUrl
                            ? `url("${c.bannerUrl}") center/cover no-repeat`
                            : `linear-gradient(135deg, ${diffColor} 0%, ${diffColor}aa 100%)`,
                          display: "flex",
                          alignItems: "flex-end",
                          padding: "8px 10px",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: `${diffColor}cc`,
                            color: "#fff",
                            border: `1px solid ${diffColor}`,
                          }}
                        >
                          {diffLabel}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(0,0,0,0.55)",
                            color: "#fff",
                          }}
                        >
                          Challenge
                        </span>
                      </div>
                      <div className="mk-card-body" style={{ padding: "10px 12px" }}>
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            fontWeight: 700,
                            color: "var(--text-heading)",
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {c.title}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                            marginBottom: 8,
                          }}
                        >
                          {c.requiredDays} ngày · {c._count.members} tham gia
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 800, color: "var(--success)", fontSize: "var(--text-sm)" }}>
                            {price > 0 ? `${fmtVnd(price)}đ` : "Miễn phí"}
                          </span>
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              fontWeight: 700,
                              padding: "3px 10px",
                              borderRadius: 5,
                              background: isJoined ? "var(--bg-elevated)" : "var(--brand-green)",
                              color: isJoined ? "var(--text-muted)" : "#fff",
                            }}
                          >
                            {isJoined ? "Đã mua ✓" : "Xem ngay →"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}

          {/* Toolbar */}
          <div className="mk-section-head">
            <h2>Tất cả items</h2>
          </div>
          <div className="mk-toolbar">
            <MarketplaceFilters />
            <div className="mk-sort">
              <span className="sort-label">Sắp xếp:</span>
              <span>Trending</span>
              <span style={{ fontSize: 9 }}>▾</span>
            </div>
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon="🏪"
              title="Chưa có sản phẩm nào trong shop"
              description="Chủ community có thể thêm product đầu tiên để bắt đầu bán."
            />
          ) : (
            <div className="mk-grid">
              {products.map((p, idx) => (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <ProductCard
                    product={p}
                    communitySlug={slug}
                    idx={idx}
                  />
                  {isOwner && (
                    <FeaturedGlobalToggle
                      kind="product"
                      resourceId={p.id}
                      communitySlug={slug}
                      initial={p.featuredOnGlobal}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="mk-stat">
      <span className="mk-stat-period">All-time</span>
      <div className="mk-stat-label">
        {icon} {label}
      </div>
      <div className="mk-stat-value">{value}</div>
      <div className="mk-stat-delta neutral">{sub}</div>
    </div>
  );
}
