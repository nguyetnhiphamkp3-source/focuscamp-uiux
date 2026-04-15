import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TYPE_THUMB: Record<string, { cls: string; icon: string; label: string }> = {
  TEMPLATE: { cls: "t-template", icon: "🎯", label: "Template" },
  TOOL: { cls: "t-tool", icon: "🧠", label: "Tool" },
  BUNDLE: { cls: "t-bundle", icon: "📦", label: "Bundle" },
  SOP: { cls: "t-sop", icon: "👥", label: "SOP Pack" },
  PROMPT: { cls: "t-prompt", icon: "💬", label: "Prompt" },
};

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN");
}

export default async function MarketplacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      products: { orderBy: { createdAt: "desc" } },
      _count: { select: { products: true } },
    },
  });
  if (!community) notFound();

  const products = community.products;
  const featured = products.slice(0, 5);
  const all = products;

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

      <div className="mk-view" id="mkListView">
        <div className="mk-inner">
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
            <div className="mk-stat">
              <span className="mk-stat-period">All-time</span>
              <div className="mk-stat-label">📦 Items</div>
              <div className="mk-stat-value">{community._count.products}</div>
              <div className="mk-stat-delta neutral">trong shop</div>
            </div>
            <div className="mk-stat">
              <span className="mk-stat-period">All-time</span>
              <div className="mk-stat-label">🛍️ Purchases</div>
              <div className="mk-stat-value">{fmtVnd(totalSales)}</div>
              <div className="mk-stat-delta neutral">đơn</div>
            </div>
            <div className="mk-stat">
              <span className="mk-stat-period">All-time</span>
              <div className="mk-stat-label">💰 Volume</div>
              <div className="mk-stat-value">
                {fmtVnd(totalVolume)}
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  đ
                </span>
              </div>
              <div className="mk-stat-delta neutral">doanh thu</div>
            </div>
            <div className="mk-stat">
              <span className="mk-stat-period">Live</span>
              <div className="mk-stat-label">✨ Featured</div>
              <div className="mk-stat-value">{featured.length}</div>
              <div className="mk-stat-delta neutral">trending</div>
            </div>
          </div>

          {/* Featured */}
          {featured.length > 0 && (
            <>
              <div className="mk-section-head">
                <h2>🔥 Featured — Trending tuần này</h2>
              </div>
              <div className="mk-carousel-wrap">
                <div className="mk-carousel">
                  {featured.map((p, idx) => {
                    const t = TYPE_THUMB[p.type] || TYPE_THUMB.TEMPLATE;
                    const price = Number(p.priceVnd);
                    const oldPrice = p.priceOldVnd ? Number(p.priceOldVnd) : null;
                    const sale =
                      oldPrice && oldPrice > price
                        ? Math.round(((oldPrice - price) / oldPrice) * 100)
                        : null;
                    return (
                      <Link
                        key={p.id}
                        href={`/c/${slug}/marketplace/${p.slug}`}
                        className="mk-card"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div className={`mk-card-thumb ${t.cls}`}>
                          <span className="mk-icon">{t.icon}</span>
                          <span className="mk-card-type">{t.label}</span>
                          {sale && <span className="mk-card-sale">-{sale}%</span>}
                          <span className="mk-card-id">
                            #{String(idx + 1).padStart(3, "0")}
                          </span>
                          {idx === 0 && <span className="mk-card-limited">Hot</span>}
                        </div>
                        <div className="mk-card-body">
                          {p.pillar && (
                            <div className="mk-card-pillar">{p.pillar}</div>
                          )}
                          <div className="mk-card-title">{p.title}</div>
                          <div className="mk-card-footer">
                            <div className="mk-card-price">
                              {oldPrice && (
                                <span className="mk-card-old">
                                  {fmtVnd(oldPrice)}đ
                                </span>
                              )}
                              {p.isFree ? (
                                <span className="mk-card-now">
                                  Miễn phí
                                </span>
                              ) : (
                                <span className="mk-card-now">
                                  {fmtVnd(price)}
                                  <span className="currency">đ</span>
                                  {p.isSubscription && (
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: "var(--text-muted)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      /{p.subscriptionPeriod || "th"}
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <span className="mk-card-cta">
                              {p.isFree
                                ? "Tải"
                                : p.isSubscription
                                  ? "Subscribe"
                                  : "Mua"}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* All items */}
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

          {all.length === 0 ? (
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
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏪</div>
              Chưa có sản phẩm nào trong shop.
            </div>
          ) : (
            <div className="mk-grid">
              {all.map((p, idx) => {
                const t = TYPE_THUMB[p.type] || TYPE_THUMB.TEMPLATE;
                const price = Number(p.priceVnd);
                const oldPrice = p.priceOldVnd ? Number(p.priceOldVnd) : null;
                const sale =
                  oldPrice && oldPrice > price
                    ? Math.round(((oldPrice - price) / oldPrice) * 100)
                    : null;
                return (
                  <Link
                    key={p.id}
                    href={`/c/${slug}/marketplace/${p.slug}`}
                    className="mk-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className={`mk-card-thumb ${t.cls}`}>
                      <span className="mk-icon">{t.icon}</span>
                      <span className="mk-card-type">{t.label}</span>
                      {sale && <span className="mk-card-sale">-{sale}%</span>}
                      <span className="mk-card-id">
                        #{String(idx + 1).padStart(3, "0")}
                      </span>
                    </div>
                    <div className="mk-card-body">
                      {p.pillar && <div className="mk-card-pillar">{p.pillar}</div>}
                      <div className="mk-card-title">{p.title}</div>
                      <div className="mk-card-footer">
                        <div className="mk-card-price">
                          {oldPrice && (
                            <span className="mk-card-old">
                              {fmtVnd(oldPrice)}đ
                            </span>
                          )}
                          {p.isFree ? (
                            <span className="mk-card-now">Miễn phí</span>
                          ) : (
                            <span className="mk-card-now">
                              {fmtVnd(price)}
                              <span className="currency">đ</span>
                              {p.isSubscription && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                  }}
                                >
                                  /{p.subscriptionPeriod || "th"}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                        <span className="mk-card-cta">
                          {p.isFree ? "Tải" : p.isSubscription ? "Subscribe" : "Mua"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
