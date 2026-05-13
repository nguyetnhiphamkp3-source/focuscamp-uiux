import Link from "next/link";
import { ProductSettingsPanel } from "@/components/marketplace/product-settings-panel";

export const TYPE_THUMB: Record<
  string,
  { cls: string; icon: string; label: string }
> = {
  TEMPLATE: { cls: "t-template", icon: "🎯", label: "Template" },
  TOOL: { cls: "t-tool", icon: "🧠", label: "Tool" },
  BUNDLE: { cls: "t-bundle", icon: "📦", label: "Bundle" },
  SOP: { cls: "t-sop", icon: "👥", label: "SOP Pack" },
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
    bumpProductId: string | null;
    upsellProductId: string | null;
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
      <div className={`mk-card-thumb ${t.cls}`}>
        <span className="mk-icon">{t.icon}</span>
        <span className="mk-card-type">{t.label}</span>
        {sale && <span className="mk-card-sale">-{sale}%</span>}
        <span className="mk-card-id">
          #{String(idx + 1).padStart(3, "0")}
        </span>
        {featured && idx === 0 && <span className="mk-card-limited">Hot</span>}
      </div>
      <div className="mk-card-body">
        {product.pillar && <div className="mk-card-pillar">{product.pillar}</div>}
        <div className="mk-card-title">{product.title}</div>
        <div className="mk-card-footer">
          <div className="mk-card-price">
            {oldPrice && (
              <span className="mk-card-old">{fmtVnd(oldPrice)}đ</span>
            )}
            {product.isFree ? (
              <span className="mk-card-now">Miễn phí</span>
            ) : (
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
            )}
          </div>
          <span className="mk-card-cta">
            {product.isFree ? "Tải" : product.isSubscription ? "Subscribe" : "Mua"}
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
