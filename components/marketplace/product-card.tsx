import Link from "next/link";
import { Download } from "lucide-react";
import { ProductSettingsPanel } from "@/components/marketplace/product-settings-panel";

export const TYPE_THUMB: Record<
  string,
  { cls: string; icon: string; label: string }
> = {
  TEMPLATE: { cls: "t-template", icon: "🎯", label: "Tài liệu" },
  TOOL: { cls: "t-tool", icon: "🧠", label: "Công cụ" },
  BUNDLE: { cls: "t-bundle", icon: "📦", label: "Combo" },
  SOP: { cls: "t-sop", icon: "👥", label: "Quy trình" },
  PROMPT: { cls: "t-prompt", icon: "💬", label: "Prompt" },
};

export function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN");
}

export type ProductLike = {
  id: string;
  slug: string;
  title: string;
  pillar: string | null;
  type: string;
  thumbnailUrl?: string | null;
  priceVnd: unknown;
  priceOldVnd: unknown;
  isFree: boolean;
  isSubscription: boolean;
  subscriptionPeriod: string | null;
};

export type ProductSettingsData = {
  productId: string;
  communitySlug: string;
  productSlug: string;
  initial: {
    title: string;
    description: string | null;
    priceVnd: number;
    priceOldVnd: number | null;
    isVisible: boolean;
    showInCartBump: boolean;
    bumpProductId: string | null;
    upsellProductId: string | null;
    type: string;
    pillar: string | null;
    thumbnailUrl: string | null;
    fileUrl: string | null;
    externalUrl: string | null;
    licenseKeyTemplate: string | null;
    featuredOnGlobal: boolean;
  };
  communityProducts: { id: string; title: string; isVisible: boolean }[];
};

export function ProductCard({
  product,
  communitySlug,
  idx,
  featured = false,
  settingsData,
}: {
  product: ProductLike;
  communitySlug: string;
  idx: number;
  featured?: boolean;
  settingsData?: ProductSettingsData;
}) {
  const t = TYPE_THUMB[product.type] || TYPE_THUMB.TEMPLATE;
  const price = Number(product.priceVnd);
  const oldPrice = product.priceOldVnd ? Number(product.priceOldVnd) : null;
  const sale =
    oldPrice && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : null;

  const cardContent = (
    <Link
      href={`/c/${communitySlug}/marketplace/${product.slug}`}
      className="mk-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        className={`mk-card-thumb ${t.cls}`}
        style={{
          backgroundImage: `url("${product.thumbnailUrl ?? `https://picsum.photos/seed/${product.id}/480/270`}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {false && <span className="mk-icon">{t.icon}</span>}
        <span className="mk-card-type">{t.label}</span>
        {featured && idx === 0 && <span className="mk-card-limited">Hot</span>}
      </div>
      <div className="mk-card-body">
        {product.pillar && <div className="mk-card-pillar">#{product.pillar}</div>}
        <div className="mk-card-title" title={product.title}>{product.title}</div>
        <div className="mk-card-footer">
          <div className="mk-card-price">
            {product.isFree ? (
              <span className="mk-card-now free">Miễn phí</span>
            ) : (
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="mk-card-now">
                  {fmtVnd(price)}
                  <span className="currency">đ</span>
                  {product.isSubscription && (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        fontWeight: "var(--fw-medium)",
                      }}
                    >
                      /{product.subscriptionPeriod || "th"}
                    </span>
                  )}
                </span>
                {oldPrice && (
                  <span className="mk-card-old">{fmtVnd(oldPrice)}đ</span>
                )}
              </div>
            )}
          </div>
          <span className="mk-card-cta">
            {product.isFree ? (
              <><Download size={12} strokeWidth={2.5} style={{ display: "inline", verticalAlign: "middle", marginRight: 4, marginTop: -1 }} />Tải</>
            ) : product.isSubscription ? "Đăng ký" : "Mua"}
          </span>
        </div>
      </div>
    </Link>
  );

  if (!settingsData) return cardContent;

  return (
    <div
      className="mk-card-settings-wrap"
      style={{ position: "relative" }}
    >
      <ProductSettingsPanel {...settingsData} />
      {cardContent}
    </div>
  );
}
