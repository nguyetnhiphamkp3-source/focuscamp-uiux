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
import { ProductDetailTabs } from "@/components/marketplace/product-detail-tabs";

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

    try {
      const result = await startProductPurchase({
        userId: s.user!.id!,
        productId: product!.id,
        couponCode,
      });
      if (result.free) {
        redirect(`/c/${communitySlug}/marketplace/${productSlug}?purchased=1`);
      }
      redirect(`/pay/${result.payment.paymentCode}`);
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
  }

  const price = Number(product.priceVnd);
  const oldPrice = product.priceOldVnd ? Number(product.priceOldVnd) : null;
  const t = TYPE_THUMB[product.type] || TYPE_THUMB.TEMPLATE;

  return (
    <>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 720, margin: "0 auto" }}>

          {/* Banner + settings overlay */}
          <div style={{ position: "relative", marginBottom: "var(--space-5)" }}>
            <div
              className={`mk-card-thumb ${t.cls}`}
              style={{
                width: "100%",
                aspectRatio: "16/9",
                borderRadius: 14,
                backgroundImage: `url("${(product as Record<string, unknown>).thumbnailUrl as string | null ?? `https://picsum.photos/seed/${product.id}/960/540`}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <span className="mk-card-type" style={{ top: 12, left: 12 }}>{t.label}</span>
            </div>
            {canManageMarketplace && (
              <div style={{ position: "absolute", top: 10, right: 10 }}>
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
          </div>

          {/* Title + price */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            {product.pillar && (
              <div style={{ fontSize: "var(--text-xs)", color: "#1B9E75", fontWeight: 500, marginBottom: 6 }}>
                #{product.pillar}
              </div>
            )}
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--header-primary)", lineHeight: 1.35, marginBottom: "var(--space-3)" }}>
              {product.title}
            </h1>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: "var(--text-2xl)", fontWeight: 800, color: "var(--brand-green)" }}>
                {product.isFree ? "Miễn phí" : `${fmtVnd(price)}đ`}
              </span>
              {oldPrice && (
                <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)", textDecoration: "line-through" }}>
                  {fmtVnd(oldPrice)}đ
                </span>
              )}
            </div>
          </div>

          {/* Tabbed: Mô tả ngắn / Sản phẩm / Đối tượng */}
          <ProductDetailTabs description={product.description} />

          {/* Content outline */}
          <div className="ui-card" style={{ marginBottom: "var(--space-4)" }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--header-primary)", marginBottom: 12 }}>
              Nội dung
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                ["Phần 1", "Tổng quan & mindset nền tảng"],
                ["Phần 2", "Thiết lập hệ thống & công cụ"],
                ["Phần 3", "Quy trình thực thi hàng ngày"],
                ["Phần 4", "Đo lường & tối ưu kết quả"],
                ["Bonus", "Template & checklist đi kèm"],
              ].map(([part, title], i, arr) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                  fontSize: "var(--text-sm)",
                }}>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "#1B9E75", minWidth: 52, textAlign: "center", background: "rgba(27,158,117,0.08)", padding: "2px 7px", borderRadius: 4 }}>
                    {part}
                  </span>
                  <span style={{ color: "var(--text-normal)" }}>{title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Related challenges */}
          {product.challenges.length > 0 && (
            <div style={{ marginBottom: "var(--space-4)", padding: "var(--space-4)", background: "var(--warning-soft)", borderRadius: "var(--r-md)" }}>
              <div style={{ fontSize: "var(--text-xs)", color: "#a16207", fontWeight: 700, marginBottom: 8 }}>
                Trang bị cho challenge
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.challenges.map((link) => (
                  <a key={link.challenge.slug} href={`/c/${communitySlug}/challenges/${link.challenge.slug}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: "var(--r-full)", background: "var(--bg-card)", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-heading)", textDecoration: "none" }}>
                    ⚔️ {link.challenge.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* License key */}
          {licenseKey && (
            <div className="ui-card" style={{ marginBottom: "var(--space-4)" }}>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 8 }}>License key của bạn (đã gửi qua email)</div>
              <code style={{ display: "block", background: "var(--bg-elevated)", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: "var(--text-md)", letterSpacing: 1, color: "var(--brand-green)", textAlign: "center", userSelect: "all" }}>
                {licenseKey}
              </code>
            </div>
          )}

          {/* Download */}
          {canDownload && (
            <div className="ui-card" style={{ marginBottom: "var(--space-4)" }}>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 8 }}>
                ✓ Bạn đã{hasPurchased ? " mua" : " là member"} — file đã sẵn sàng
              </div>
              <a href={`/api/products/${product.id}/download`} className="ui-btn ui-btn-primary ui-btn-lg" style={{ textDecoration: "none" }}>
                Tải file
              </a>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 8 }}>
                Link download có hiệu lực 15 phút sau click.
              </div>
            </div>
          )}

          {/* Purchase CTA */}
          <div className="ui-card">
            {!product.isFree ? (
              !session?.user ? (
                <div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>Đăng nhập để mua sản phẩm này.</p>
                  <Link href="/login" className="ui-btn ui-btn-primary ui-btn-lg">Đăng nhập</Link>
                </div>
              ) : !isMember ? (
                <div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>
                    Tham gia community &ldquo;{product.community.name}&rdquo; để được mua.
                  </p>
                  <Link href={`/c/${communitySlug}`} className="ui-btn ui-btn-primary ui-btn-lg">Vào community</Link>
                </div>
              ) : hasPurchased && !product.isSubscription ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "var(--text-md)", fontWeight: 600, color: "var(--brand-green)", marginBottom: 4 }}>✓ Bạn đã sở hữu sản phẩm này</div>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Truy cập file/license ở phần trên.</div>
                </div>
              ) : (
                <>
                  <BuyWithCoupon
                    communityId={product.community.id}
                    productId={product.id}
                    priceVnd={price}
                    buyLabel={product.isSubscription ? "Đăng ký ngay" : "Mua ngay"}
                    action={buy}
                    addToCart={!product.isSubscription ? <AddToCartButton productId={product.id} /> : undefined}
                  />
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 10 }}>
                    Thanh toán qua VietQR · Tự nhận khi SePay xác nhận
                  </div>
                </>
              )
            ) : (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>Sản phẩm miễn phí</div>
                <button className="ui-btn ui-btn-primary ui-btn-lg" disabled>Tải về (coming soon)</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
