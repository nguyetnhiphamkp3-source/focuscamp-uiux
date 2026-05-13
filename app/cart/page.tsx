import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseCart } from "@/lib/cart";
import { CartCheckoutButton } from "./checkout-button";
import { CartBumpOffer } from "@/components/marketplace/cart-bump-offer";

export default async function CartPage() {
  const c = await cookies();
  const cartItems = parseCart(c.get("fc_cart")?.value);

  if (cartItems.length === 0) {
    return (
      <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-body)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
          <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--text-heading)", margin: "0 0 8px" }}>Giỏ hàng trống</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", marginBottom: 24 }}>Thêm sản phẩm từ marketplace để bắt đầu.</p>
          <Link href="/" style={{ color: "var(--brand-green)", fontWeight: 600, textDecoration: "none" }}>← Quay lại</Link>
        </div>
      </main>
    );
  }

  const session = await auth();
  if (!session?.user) redirect(`/login?redirectTo=/cart`);

  const productIds = cartItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, priceVnd: true, slug: true, community: { select: { id: true, slug: true } } },
  });

  const communityId = products[0]?.community?.id;
  const bumpCandidate = communityId
    ? await prisma.product.findFirst({
        where: {
          communityId,
          showInCartBump: true,
          id: { notIn: productIds },
        },
        select: { id: true, title: true, priceVnd: true, description: true },
      })
    : null;

  const totalVnd = products.reduce((sum, p) => sum + Number(p.priceVnd), 0);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-body)" }}>
      <div style={{ width: "100%", maxWidth: 520, background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 20, boxShadow: "0 1px 3px rgba(60,45,20,0.08)", padding: 28 }}>
        <Link href="/" style={{ display: "inline-block", fontSize: 28, marginBottom: 8, textDecoration: "none" }}>🔥🏕️</Link>
        <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--text-heading)", margin: "4px 0 12px" }}>
          Giỏ hàng ({products.length} sản phẩm)
        </h1>
        {products[0]?.community?.slug && (
          <Link
            href={`/c/${products[0].community.slug}/marketplace`}
            style={{ display: "inline-block", fontSize: "var(--text-sm)", color: "var(--text-muted)", textDecoration: "none", marginBottom: 16 }}
          >
            ← Tiếp tục mua sắm
          </Link>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {products.map((product) => (
            <CartLineItem
              key={product.id}
              productId={product.id}
              title={product.title}
              priceVnd={Number(product.priceVnd)}
              href={product.community ? `/c/${product.community.slug}/marketplace/${product.slug}` : "#"}
            />
          ))}
        </div>

        {bumpCandidate && (
          <CartBumpOffer product={{ ...bumpCandidate, priceVnd: Number(bumpCandidate.priceVnd) }} />
        )}

        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>Tổng</span>
          <span style={{ fontWeight: 800, fontSize: "var(--text-lg)", color: "var(--brand-green)" }}>
            {totalVnd.toLocaleString("vi-VN")}đ
          </span>
        </div>

        <CartCheckoutButton productIds={productIds} />
      </div>
    </main>
  );
}

function CartLineItem({ productId, title, priceVnd, href }: { productId: string; title: string; priceVnd: number; href: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 10 }}>
      <Link href={href} style={{ flex: 1, fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-heading)", textDecoration: "none" }}>
        {title}
      </Link>
      <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--text-heading)", whiteSpace: "nowrap" }}>
        {priceVnd.toLocaleString("vi-VN")}đ
      </span>
    </div>
  );
}
