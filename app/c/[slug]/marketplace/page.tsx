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
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string; q?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { type, q, page: pageParam } = await searchParams;
  const PAGE_SIZE = 6;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10));
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, _count: { select: { products: true } } },
  });
  if (!community) notFound();
  const realIsOwner = session?.user?.id === community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);

  // Check if user is admin (for stats visibility)
  const membership = session?.user?.id && !realIsOwner
    ? await prisma.membership.findUnique({
        where: { userId_communityId: { userId: session.user.id, communityId: community.id } },
        select: { role: true },
      })
    : null;
  const role = effectiveCommunityRole({ isOwner: realIsOwner, membershipRole: membership?.role });
  const canSeeStats = isOwner || role === "ADMIN";
  const canManageMarketplace = canCommunity(role, "manage_marketplace");

  const productWhere: Record<string, unknown> = { communityId: community.id };
  if (!canManageMarketplace) productWhere.isVisible = true;
  if (type === "FREE") productWhere.isFree = true;
  else if (type) productWhere.type = type;
  if (q) productWhere.title = { contains: q, mode: "insensitive" };

  const [products, totalProducts, allProducts, paidChallenges] = await Promise.all([
    prisma.product.findMany({ where: productWhere, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.product.count({ where: productWhere }),
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

  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);
  const featured = allProducts.slice(0, 5);
  const totalSales = allProducts.reduce((s, p) => s + p.soldCount, 0);
  const totalVolume = allProducts.reduce((s, p) => s + Number(p.priceVnd) * p.soldCount, 0);

  return (
    <>
      <header className="view-header">
        <span className="view-title">Cửa hàng</span>
        <span className="view-subtitle">Thử thách &amp; công cụ cho hành trình của bạn</span>
      </header>

      <div className="mk-view">
        <div className="mk-inner">
          {canManageMarketplace && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
              <CreateProductButton communityId={community.id} communitySlug={slug} />
            </div>
          )}

          {/* Hero */}
          <div className="mk-hero">
            <div className="mk-hero-emoji">🏕️</div>
            <div className="mk-hero-text">
              <div className="mk-hero-title">Cửa hàng</div>
              <div className="mk-hero-desc">
                Đăng ký thử thách để bắt đầu hành trình — hoặc mua thêm tài liệu, công cụ để lên level nhanh hơn.
              </div>
            </div>
          </div>

          {/* Stats — only visible to owner/admin */}
          {canSeeStats && (
            <div className="mk-stats">
              <StatCard icon="⚔️" label="Thử thách" value={String(paidChallenges.length)} sub="đang mở" />
              <StatCard icon="📦" label="Sản phẩm" value={String(community._count.products)} sub="trong shop" />
              <StatCard icon="🛍️" label="Đơn hàng" value={fmtVnd(totalSales)} sub="đã bán" />
              <StatCard icon="💰" label="Doanh thu" value={`${fmtVnd(totalVolume)}đ`} sub="tổng cộng" />
            </div>
          )}

          {/* ===== CHALLENGES — flagship section ===== */}
          {paidChallenges.length > 0 && (
            <>
              <div className="mk-section-head" style={{ marginTop: "var(--space-4)" }}>
                <h2>⚔️ Thử thách nổi bật</h2>
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
                <h2>🔥 Nổi bật — Trending tuần này</h2>
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
            <h2>Tất cả sản phẩm</h2>
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
          ) : (() => {
            // Build the bump/upsell picker list ONCE for the whole page.
            // Each settings modal filters out its own product client-side, so
            // we don't need to materialise N copies of the same list in the HTML.
            const communityProductsList = canManageMarketplace
              ? allProducts.map((ap) => ({
                  id: ap.id,
                  title: ap.title,
                  isVisible: (ap as Record<string, unknown>).isVisible as boolean ?? true,
                }))
              : [];
            return (
              <div className="mk-grid">
                {products.map((p, idx) => (
                  <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <ProductCard
                      product={p}
                      communitySlug={slug}
                      idx={idx}
                      settingsData={canManageMarketplace ? {
                        productId: p.id,
                        communitySlug: slug,
                        productSlug: p.slug,
                        initial: {
                          title: p.title,
                          description: p.description ?? null,
                          priceVnd: Number(p.priceVnd),
                          priceOldVnd: p.priceOldVnd ? Number(p.priceOldVnd) : null,
                          isVisible: (p as Record<string, unknown>).isVisible as boolean ?? true,
                          showInCartBump: (p as Record<string, unknown>).showInCartBump as boolean ?? false,
                          bumpProductId: (p as Record<string, unknown>).bumpProductId as string | null ?? null,
                          upsellProductId: (p as Record<string, unknown>).upsellProductId as string | null ?? null,
                          type: p.type,
                          pillar: p.pillar ?? null,
                          thumbnailUrl: (p as Record<string, unknown>).thumbnailUrl as string | null ?? null,
                          fileUrl: (p as Record<string, unknown>).fileUrl as string | null ?? null,
                          externalUrl: (p as Record<string, unknown>).externalUrl as string | null ?? null,
                          licenseKeyTemplate: (p as Record<string, unknown>).licenseKeyTemplate as string | null ?? null,
                          featuredOnGlobal: p.featuredOnGlobal ?? false,
                        },
                        communityProducts: communityProductsList,
                      } : undefined}
                    />
                    {false && canManageMarketplace && (
                      <FeaturedGlobalToggle kind="product" resourceId={p.id} communitySlug={slug} initial={p.featuredOnGlobal} />
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Pagination */}
          {totalPages > 1 && (() => {
            const buildHref = (p: number) => {
              const sp = new URLSearchParams();
              if (type) sp.set("type", type);
              if (q) sp.set("q", q);
              if (p > 1) sp.set("page", String(p));
              const qs = sp.toString();
              return `/c/${slug}/marketplace${qs ? `?${qs}` : ""}`;
            };
            return (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: "var(--space-6)" }}>
                <a
                  href={buildHref(page - 1)}
                  aria-disabled={page <= 1}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: "var(--text-sm)", fontWeight: 500,
                    background: "var(--bg-card)", color: page <= 1 ? "var(--text-muted)" : "var(--text-normal)",
                    pointerEvents: page <= 1 ? "none" : "auto", opacity: page <= 1 ? 0.4 : 1,
                    textDecoration: "none",
                  }}
                >
                  ← Trước
                </a>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <a
                    key={p}
                    href={buildHref(p)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: "var(--text-sm)", fontWeight: p === page ? 700 : 400,
                      background: p === page ? "var(--online-green)" : "var(--bg-card)",
                      color: p === page ? "#fff" : "var(--text-normal)",
                      textDecoration: "none", minWidth: 36, textAlign: "center",
                    }}
                  >
                    {p}
                  </a>
                ))}
                <a
                  href={buildHref(page + 1)}
                  aria-disabled={page >= totalPages}
                  style={{
                    padding: "6px 14px", borderRadius: 8, fontSize: "var(--text-sm)", fontWeight: 500,
                    background: "var(--bg-card)", color: page >= totalPages ? "var(--text-muted)" : "var(--text-normal)",
                    pointerEvents: page >= totalPages ? "none" : "auto", opacity: page >= totalPages ? 0.4 : 1,
                    textDecoration: "none",
                  }}
                >
                  Sau →
                </a>
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string; sub: string }) {
  return (
    <div className="mk-stat">
      <span className="mk-stat-period">Tất cả</span>
      <div className="mk-stat-label">{icon} {label}</div>
      <div className="mk-stat-value">{value}</div>
      <div className="mk-stat-delta neutral">{sub}</div>
    </div>
  );
}
