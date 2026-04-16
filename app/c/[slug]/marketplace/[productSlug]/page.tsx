import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startProductPurchase } from "@/lib/services/payment";
import { fmtVnd, TYPE_THUMB } from "@/components/marketplace/product-card";
import { logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug: communitySlug, productSlug } = await params;

  const product = await prisma.product.findFirst({
    where: { community: { slug: communitySlug }, slug: productSlug },
    include: {
      community: { select: { id: true, name: true, slug: true } },
      challenges: {
        include: {
          challenge: {
            select: { slug: true, title: true, difficulty: true },
          },
        },
      },
    },
  });
  if (!product) notFound();

  const session = await auth();
  let isMember = false;
  if (session?.user?.id) {
    const m = await prisma.membership.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: product.communityId,
        },
      },
      select: { id: true },
    });
    isMember = !!m;
  }

  async function buy() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) redirect("/login");

    let paymentCode: string;
    try {
      const result = await startProductPurchase({
        userId: s.user!.id!,
        productId: product!.id,
      });
      paymentCode = result.payment.paymentCode;
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "not_a_member") redirect(`/c/${communitySlug}`);
        if (err.message === "product_not_found") redirect(`/c/${communitySlug}/marketplace`);
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
              }}
            >
              <span className="mk-icon">{t.icon}</span>
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
                ) : (
                  <form action={buy}>
                    <button
                      type="submit"
                      className="ui-btn ui-btn-primary ui-btn-lg"
                    >
                      {product.isSubscription ? "Subscribe ngay" : "Mua ngay"}
                    </button>
                    <div
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        marginTop: "var(--space-3)",
                      }}
                    >
                      Thanh toán qua VietQR · Tự nhận khi SePay xác nhận
                    </div>
                  </form>
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
