import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProductCard, fmtVnd } from "@/components/marketplace/product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateProductButton } from "@/components/community/create-product-button";
import { FeaturedGlobalToggle } from "@/components/marketplace/featured-global-toggle";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      products: { orderBy: { createdAt: "desc" } },
      _count: { select: { products: true } },
    },
  });
  if (!community) notFound();
  const isOwner = session?.user?.id === community.ownerId;

  const products = community.products;
  const featured = products.slice(0, 5);

  const totalSales = products.reduce((s, p) => s + p.soldCount, 0);
  const totalVolume = products.reduce(
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

          {/* Toolbar */}
          <div className="mk-section-head">
            <h2>Tất cả items</h2>
          </div>
          <div className="mk-toolbar">
            <div className="mk-filters">
              <div className="mk-filter active">Tất cả</div>
              <div className="mk-filter">Templates</div>
              <div className="mk-filter">SOP</div>
              <div className="mk-filter">Tools</div>
              <div className="mk-filter">Prompts</div>
              <div className="mk-filter">Bundles</div>
              <div className="mk-filter">Miễn phí</div>
              <div className="mk-filter">Đã mua</div>
            </div>
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
                      productId={p.id}
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
