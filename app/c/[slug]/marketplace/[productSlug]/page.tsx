import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startProductPurchase } from "@/lib/services/payment";
import { fmtVnd, TYPE_THUMB } from "@/components/marketplace/product-card";
import { ProductSettingsPanel } from "@/components/marketplace/product-settings-panel";
import { AddToCartButton } from "@/components/marketplace/add-to-cart-button";
import { BuyWithCoupon } from "@/components/marketplace/buy-with-coupon";
import { logError } from "@/lib/logger";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { canCommunity, effectiveCommunityRole } from "@/lib/community-permissions";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug: communitySlug, productSlug } = await params;

  // Parallel: session + product fetch are independent
  const [session, product] = await Promise.all([
    auth(),
    prisma.product.findFirst({
      where: { community: { slug: communitySlug }, slug: productSlug },
      include: {
        community: { select: { id: true, name: true, slug: true, ownerId: true } },
        challenges: {
          include: {
            challenge: {
              select: { slug: true, title: true, difficulty: true },
            },
          },
        },
      },
    }),
  ]);
  if (!product) notFound();

  const realIsOwner = session?.user?.id === product.community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);

  // Parallel: combined membership (role + presence) + purchase status.
  // Membership row carries both role (for permission gate) AND id (presence flag) —
  // was 2 separate queries on the same row before.
  const [membership, purchase] = await Promise.all([
    session?.user?.id
      ? prisma.membership.findUnique({
          where: { userId_communityId: { userId: session.user.id, communityId: product.communityId } },
          select: { id: true, role: true },
        })
      : Promise.resolve(null),
    session?.user?.id
      ? prisma.purchase.findFirst({
          where: {
            userId: session.user.id,
            productId: product.id,
            status: "COMPLETED",
          },
          select: { id: true, licenseKey: true },
        })
      : Promise.resolve(null),
  ]);
  const isMember = !!membership;
  const hasPurchased = !!purchase;
  const licenseKey = purchase?.licenseKey ?? null;

  // ADMIN role members can manage marketplace too (same as OWNER)
  const role = effectiveCommunityRole({ isOwner: realIsOwner, membershipRole: membership?.role });
  const canManageMarketplace = canCommunity(role, "manage_marketplace");

  const communityProducts = canManageMarketplace
    ? await prisma.product.findMany({
        where: { communityId: product.communityId },
        select: { id: true, title: true, isVisible: true },
      })
    : [];
  // Free products available to any member
  const canDownload =
    !!product.fileUrl && (hasPurchased || (product.isFree && isMember));

  async function buy(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user?.id) redirect("/login");

    const rawCouponCode = formData.get("couponCode");
    const couponCode =
      typeof rawCouponCode === "string" && rawCouponCode.trim()
        ? rawCouponCode.trim().toUpperCase()
        : undefined;

    let paymentCode: string;
    try {
      const result = await startProductPurchase({
        userId: s.user!.id!,
        productId: product!.id,
        couponCode,
      });
      paymentCode = result.payment.paymentCode;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "not_a_member") redirect(`/c/${communitySlug}`);
        if (err.message === "product_not_found") redirect(`/c/${communitySlug}/marketplace`);
        if (err.message === "already_purchased") {
          redirect(`/c/${communitySlug}/marketplace/${productSlug}`);
        }
        if (err.message.startsWith("coupon_invalid:")) {
          redirect(
            `/c/${communitySlug}/marketplace/${productSlug}?couponError=${encodeURIComponent(err.message.slice("coupon_invalid:".length))}`
          );
        }
      }
      logError(err, { productId: product!.id, userId: s.user!.id! });
      throw err;
    }
    redirect(`/pay/${paymentCode}`);
  }

  const price = Number(product.priceVnd);
  const oldPrice = product.priceOldVnd ? Number(product.priceOldVnd) : null;
  const t = TYPE_THUMB[product.type] || TYPE_THUMB.TEMPLATE;

  return (
    <>
      <header className="view-header">
        <span className="view-title">{product.title}</span>
        <span className="view-subtitle">
          {product.pillar || t.label} · {t.label}
        </span>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-6) var(--space-8)",
        }}
      >
        <div style={{ maxWidth: 760 }}>
          {/* Admin/Owner settings panel */}
          {canManageMarketplace && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <ProductSettingsPanel
                productId={product.id}
                communitySlug={communitySlug}
                productSlug={productSlug}
                standalone
                initial={{
                  title: product.title,
                  description: product.description ?? null,
                  priceVnd: Number(product.priceVnd),
                  priceOldVnd: product.priceOldVnd ? Number(product.priceOldVnd) : null,
                  isVisible: (product as Record<string, unknown>).isVisible as boolean ?? true,
                  showInCartBump: (product as Record<string, unknown>).showInCartBump as boolean ?? false,
                  bumpProductId: (product as Record<string, unknown>).bumpProductId as string | null ?? null,
                  upsellProductId: (product as Record<string, unknown>).upsellProductId as string | null ?? null,
                  type: product.type,
                  pillar: product.pillar ?? null,
                  thumbnailUrl: (product as Record<string, unknown>).thumbnailUrl as string | null ?? null,
                  fileUrl: (product as Record<string, unknown>).fileUrl as string | null ?? null,
                  externalUrl: (product as Record<string, unknown>).externalUrl as string | null ?? null,
                  licenseKeyTemplate: (product as Record<string, unknown>).licenseKeyTemplate as string | null ?? null,
                  featuredOnGlobal: (product as Record<string, unknown>).featuredOnGlobal as boolean ?? false,
                }}
                communityProducts={communityProducts.map((cp) => ({
                  id: cp.id,
                  title: cp.title,
                  isVisible: cp.isVisible ?? true,
                }))}
              />
            </div>
          )}

          {/* Header card */}
          <div
            className="ui-card ui-card-lg"
            style={{
              display: "flex",
              gap: "var(--space-5)",
              alignItems: "center",
              marginBottom: "var(--space-5)",
            }}
          >
            <div
              className={`mk-card-thumb ${t.cls}`}
              style={{
                width: 120,
                height: 120,
                borderRadius: "var(--r-lg)",
                flexShrink: 0,
                ...(product.thumbnailUrl
                  ? {
                      backgroundImage: `url("${product.thumbnailUrl}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : {}),
              }}
            >
              {!product.thumbnailUrl && <span className="mk-icon">{t.icon}</span>}
              <span className="mk-card-type">{t.label}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "var(--text-xl)",
                  marginBottom: "var(--space-1)",
                  lineHeight: "var(--lh-tight)",
                }}
              >
                {product.title}
              </h1>
              {product.pillar && (
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {product.pillar}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "var(--space-2)",
                }}
              >
                {oldPrice && (
                  <span
                    style={{
                      color: "var(--text-muted)",
                      textDecoration: "line-through",
                      fontSize: "var(--text-base)",
                    }}
                  >
                    {fmtVnd(oldPrice)}đ
                  </span>
                )}
                <span
                  style={{
                    fontSize: "var(--text-2xl)",
                    fontWeight: "var(--fw-extrabold)",
                    color: "var(--brand-green)",
                  }}
                >
                  {product.isFree
                    ? "Miễn phí"
                    : `${fmtVnd(price)}đ${
                        product.isSubscription
                          ? "/" + (product.subscriptionPeriod || "th")
                          : ""
                      }`}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div
              className="ui-card"
              style={{
                lineHeight: "var(--lh-relaxed)",
                marginBottom: "var(--space-5)",
              }}
            >
              {product.description}
            </div>
          )}

          {/* Related challenges */}
          {product.challenges.length > 0 && (
            <div
              style={{
                marginBottom: "var(--space-5)",
                padding: "var(--space-4)",
                background: "var(--warning-soft)",
                border: "1px solid var(--warning)",
                borderRadius: "var(--r-md)",
              }}
            >
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#a16207",
                  fontWeight: "var(--fw-bold)",
                  marginBottom: "var(--space-2)",
                }}
              >
                🎒 Trang bị cho challenge
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
                {product.challenges.map((link) => (
                  <a
                    key={link.challenge.slug}
                    href={`/c/${communitySlug}/challenges/${link.challenge.slug}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: "var(--r-full)",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "var(--text-sm)",
                      fontWeight: "var(--fw-semibold)",
                      color: "var(--text-heading)",
                      textDecoration: "none",
                    }}
                  >
                    ⚔️ {link.challenge.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* License key (after LICENSE purchase) */}
          {licenseKey && (
            <div className="ui-card" style={{ marginBottom: "var(--space-3)" }}>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                🔑 License key của bạn (đã gửi qua email)
              </div>
              <code
                style={{
                  display: "block",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "monospace",
                  fontSize: "var(--text-md)",
                  letterSpacing: 1,
                  color: "var(--brand-green)",
                  textAlign: "center",
                  userSelect: "all",
                }}
              >
                {licenseKey}
              </code>
            </div>
          )}

          {/* Download (after purchase) */}
          {canDownload && (
            <div className="ui-card" style={{ marginBottom: "var(--space-3)" }}>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-2)",
                }}
              >
                ✓ Bạn đã{hasPurchased ? " mua" : " là member"} — file đã sẵn sàng
              </div>
              <a
                href={`/api/products/${product.id}/download`}
                className="ui-btn ui-btn-primary ui-btn-lg"
                style={{ textDecoration: "none" }}
              >
                📥 Download file
              </a>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: "var(--space-2)",
                }}
              >
                Link download có hiệu lực 15 phút sau click.
              </div>
            </div>
          )}

          {/* Purchase CTA */}
          <div className="ui-card">
            {!product.isFree ? (
              <>
                {!session?.user ? (
                  <div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-muted)",
                        marginBottom: "var(--space-3)",
                      }}
                    >
                      Đăng nhập để mua sản phẩm này.
                    </p>
                    <Link href="/login" className="ui-btn ui-btn-primary ui-btn-lg">
                      Đăng nhập
                    </Link>
                  </div>
                ) : !isMember ? (
                  <div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-muted)",
                        marginBottom: "var(--space-3)",
                      }}
                    >
                      Tham gia community &ldquo;{product.community.name}&rdquo;
                      để được mua.
                    </p>
                    <Link
                      href={`/c/${communitySlug}`}
                      className="ui-btn ui-btn-primary ui-btn-lg"
                    >
                      Vào community
                    </Link>
                  </div>
                ) : hasPurchased && !product.isSubscription ? (
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "var(--text-md)",
                        fontWeight: "var(--fw-semibold)",
                        color: "var(--brand-green)",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      ✓ Bạn đã sở hữu sản phẩm này
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-muted)",
                      }}
                    >
                      Truy cập file/license ở phần trên.
                    </div>
                  </div>
                ) : (
                  <>
                    <BuyWithCoupon
                      communityId={product.community.id}
                      productId={product.id}
                      priceVnd={price}
                      buyLabel={product.isSubscription ? "Subscribe ngay" : "Mua ngay"}
                      action={buy}
                      addToCart={
                        !product.isSubscription ? (
                          <AddToCartButton productId={product.id} />
                        ) : undefined
                      }
                    />
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        marginTop: "var(--space-3)",
                      }}
                    >
                      Thanh toán qua VietQR · Tự nhận khi SePay xác nhận
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  Sản phẩm miễn phí
                </div>
                <button className="ui-btn ui-btn-primary ui-btn-lg" disabled>
                  Tải về (coming soon)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
