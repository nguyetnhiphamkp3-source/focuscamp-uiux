import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createPayment } from "@/lib/sepay";

export const dynamic = "force-dynamic";

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN");
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug: communitySlug, productSlug } = await params;

  const product = await prisma.product.findFirst({
    where: { community: { slug: communitySlug }, slug: productSlug },
    include: { community: true },
  });
  if (!product) notFound();

  async function buy() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) redirect("/login");

    // Create a Purchase record (pending) + a Payment and redirect to pay page
    const purchase = await prisma.purchase.create({
      data: {
        userId: s.user!.id!,
        productId: product!.id,
        amountVnd: product!.priceVnd,
        status: "PENDING",
      },
    });

    const payment = await createPayment({
      userId: s.user!.id!,
      communityId: product!.communityId,
      purpose: "product",
      refType: "product",
      refId: purchase.id,
      amountVnd: Number(product!.priceVnd),
    });

    redirect(`/pay/${payment.paymentCode}`);
  }

  const price = Number(product.priceVnd);
  const oldPrice = product.priceOldVnd ? Number(product.priceOldVnd) : null;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ maxWidth: 720 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginTop: 16,
            marginBottom: 6,
            color: "var(--text-heading)",
          }}
        >
          {product.title}
        </h1>
        {product.pillar && (
          <div style={{ color: "var(--text-muted)", marginBottom: 16 }}>
            {product.pillar} · {product.type}
          </div>
        )}

        {product.description && (
          <p
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 20,
              color: "var(--text-normal)",
              lineHeight: 1.6,
              marginBottom: 20,
            }}
          >
            {product.description}
          </p>
        )}

        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
            padding: 20,
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1 }}>
            {oldPrice && (
              <div
                style={{
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                  fontSize: 14,
                }}
              >
                {fmtVnd(oldPrice)}đ
              </div>
            )}
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "var(--brand-green)",
              }}
            >
              {product.isFree
                ? "Miễn phí"
                : `${fmtVnd(price)}đ${product.isSubscription ? "/" + (product.subscriptionPeriod || "tháng") : ""}`}
            </div>
          </div>
          {!product.isFree && (
            <form action={buy}>
              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  background: "var(--brand-green)",
                  border: "none",
                  borderRadius: 10,
                }}
              >
                {product.isSubscription ? "Subscribe ngay" : "Mua ngay"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
