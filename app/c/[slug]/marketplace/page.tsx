import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ProductCard, fmtVnd } from "@/components/marketplace/product-card";
import { ChallengeMarketCard } from "@/components/marketplace/challenge-market-card";
import { CarouselNavBtns } from "@/components/marketplace/carousel-nav-btns";
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
  searchParams: Promise<{ type?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { type, q } = await searchParams;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, _count: { select: { products: true } } },
  });
  if (!community) notFound();
  const isOwner = session?.user?.id === community.ownerId;

  const productWhere: Record<string, unknown> = { communityId: community.id };
  if (!isOwner) productWhere.isVisible = true;
  if (type === "FREE") productWhere.isFree = true;
  else if (type) productWhere.type = type;
  if (q) productWhere.title = { contains: q, mode: "insensitive" };

  const [products, allProducts, paidChallenges] = await Promise.all([
    prisma.product.findMany({ where: productWhere, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { communityId: community.id }, orderBy: { createdAt: "desc" } }),
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
  const totalVolume = allProducts.reduce((s, p) => s + Number(p.priceVnd) * p.soldCount, 0);

  return (
    <>
      <header className="view-header">
        <span className="view-title">Marketplace</span>
        <span className="view-subtitle">Challenges &amp; power-ups cho hành trình của bạn</span>
      </header>

      <div className="mk-view">
        <div className="mk-inner">
          {isOwner && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
              <CreateProductButton communityId={community.id} communitySlug={slug} />
            </div>
          )}

          {/* Hero */}
          <div className="mk-hero">
            <div className="mk-hero-emoji">🏕️</div>
            <div className="mk-hero-text">
              <div className="mk-hero-title">Marketplace</div>
              <div className="mk-hero-desc">
                Đăng ký challenges để bắt đầu hành trình — hoặc mua thêm templates, SOP, tools để lên level nhanh hơn.
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mk-stats">
            <StatCard icon="⚔️" label="Challenges" value={String(paidChallenges.length)} sub="đang mở" />
            <StatCard icon="📦" label="Items" value={String(community._count.products)} sub="trong shop" />
            <StatCard icon="🛍️" label="Purchases" value={fmtVnd(totalSales)} sub="đơn" />
            <StatCard icon="💰" label="Volume" value={`${fmtVnd(totalVolume)}đ`} sub="doanh thu" />
          </div>

          {/* ===== CHALLENGES — flagship section ===== */}
          {paidChallenges.length > 0 && (
            <>
              <div className="mk-section-head" style={{ marginTop: "var(--space-4)" }}>
                <h2>⚔️ Flagship Challenges</h2>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600 }}>
                  Lõi tư tưởng của focus.camp
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                  gap: 16,
                  marginBottom: "var(--space-8)",
                }}
              >
                {paidChallenges.map((c) => (
                  <ChallengeMarketCard
                    key={c.id}
                    communitySlug={slug}
                    challenge={c}
                    isJoined={joinedChallengeIds.has(c.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ===== FEATURED CAROUSEL ===== */}
          {featured.length > 0 && (
            <>
              <div className="mk-section-head">
                <h2>🔥 Featured — Trending tuần này</h2>
                <CarouselNavBtns carouselId="featured-carousel" />
              </div>
              <div className="mk-carousel-wrap">
                <div id="featured-carousel" className="mk-carousel">
                  {featured.map((p, idx) => (
                    <ProductCard key={p.id} product={p} communitySlug={slug} idx={idx} featured />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===== ALL PRODUCTS ===== */}
          <div className="mk-section-head">
            <h2>Tất cả items</h2>
          </div>
          <div style={{ marginBottom: "var(--space-4)" }}>
            <MarketplaceFilters />
          </div>

          {products.length === 0 ? (
            <EmptyState
              icon="🏪"
              title={q ? `Không tìm thấy "${q}"` : "Chưa có sản phẩm nào"}
              description={q ? "Thử từ khóa khác." : "Chủ community có thể thêm product đầu tiên."}
            />
          ) : (
            <div className="mk-grid">
              {products.map((p, idx) => (
                <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <ProductCard
                    product={p}
                    communitySlug={slug}
                    idx={idx}
                    settingsData={isOwner ? {
                      productId: p.id,
                      communitySlug: slug,
                      productSlug: p.slug,
                      initial: {
                        title: p.title,
                        description: p.description ?? null,
                        priceVnd: Number(p.priceVnd),
                        priceOldVnd: p.priceOldVnd ? Number(p.priceOldVnd) : null,
                        isVisible: (p as Record<string, unknown>).isVisible as boolean ?? true,
                        bumpProductId: (p as Record<string, unknown>).bumpProductId as string | null ?? null,
                        upsellProductId: (p as Record<string, unknown>).upsellProductId as string | null ?? null,
                      },
                      communityProducts: allProducts
                        .filter((ap) => ap.id !== p.id)
                        .map((ap) => ({
                          id: ap.id,
                          title: ap.title,
                          isVisible: (ap as Record<string, unknown>).isVisible as boolean ?? true,
                        })),
                    } : undefined}
                  />
                  {isOwner && (
                    <FeaturedGlobalToggle kind="product" resourceId={p.id} communitySlug={slug} initial={p.featuredOnGlobal} />
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

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="mk-stat">
      <span className="mk-stat-period">All-time</span>
      <div className="mk-stat-label">{icon} {label}</div>
      <div className="mk-stat-value">{value}</div>
      <div className="mk-stat-delta neutral">{sub}</div>
    </div>
  );
}
