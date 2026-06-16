"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ShoppingCart, X, Tag } from "lucide-react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { parseCart } from "@/lib/cart";
import { removeFromCartAction, getCartProductsAction, checkoutCartAction, type CartProductInfo } from "@/app/actions/cart";
import { CouponInput, type CouponApplied } from "@/components/checkout/coupon-input";

function useCartIds() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    function readCart() {
      const raw = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("fc_cart="))
        ?.replace("fc_cart=", "");
      setIds(parseCart(raw ? decodeURIComponent(raw) : undefined).map((i) => i.productId));
    }
    readCart();
    window.addEventListener("focus", readCart);
    window.addEventListener("cartUpdated", readCart);
    return () => {
      window.removeEventListener("focus", readCart);
      window.removeEventListener("cartUpdated", readCart);
    };
  }, []);
  return ids;
}

function fmtVnd(n: number) { return n.toLocaleString("vi-VN"); }

function CartItemRow({ product, onRemoved }: { product: CartProductInfo; onRemoved: (id: string) => void }) {
  const [pending, start] = useTransition();
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 10,
    }}>
      <Link
        href={`/c/${product.communitySlug}/marketplace/${product.slug}`}
        style={{ flex: 1, fontWeight: 600, fontSize: "var(--text-sm)", color: "var(--text-heading)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {product.title}
      </Link>
      <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--text-heading)", whiteSpace: "nowrap" }}>
        {fmtVnd(product.priceVnd)}đ
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          await removeFromCartAction(product.id);
          window.dispatchEvent(new Event("cartUpdated"));
          onRemoved(product.id);
        })}
        style={{
          width: 28, height: 28, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "var(--r-md)", border: "1px solid var(--border-subtle)",
          background: "var(--bg-card)", color: "var(--text-muted)",
          cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.5 : 1,
          fontWeight: 700, fontSize: 16, lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function CartPopupContent({
  products,
  communitySlug,
  onClose,
  onRemoved,
}: {
  products: CartProductInfo[];
  communitySlug?: string;
  onClose: () => void;
  onRemoved: (id: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<CouponApplied | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const communityId = products[0]?.communityId ?? "";

  const total = products.reduce((s, p) => s + p.priceVnd, 0);
  const finalAmount = applied ? applied.finalAmountVnd : total;

  async function handleCheckout() {
    setLoading(true);
    const res = await checkoutCartAction(undefined, { couponCode: applied?.couponCode });
    if (res.ok) {
      onClose();
      if (res.free) {
        router.refresh();
      } else {
        router.push(`/pay/${res.paymentCode}`);
      }
    } else {
      alert("Lỗi: " + res.reason);
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "0 20px 20px" }}>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {products.map((p) => (
          <CartItemRow key={p.id} product={p} onRemoved={onRemoved} />
        ))}
      </div>

      {/* Total */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>Tổng</span>
        <span style={{ fontWeight: 800, fontSize: "var(--text-lg)", color: "var(--brand-green)" }}>
          {fmtVnd(applied ? applied.finalAmountVnd : total)}đ
        </span>
      </div>

      {/* Coupon */}
      <div style={{ marginBottom: 12 }}>
        {!showCoupon && !applied ? (
          <button
            type="button"
            onClick={() => setShowCoupon(true)}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "var(--text-sm)", fontWeight: 500, color: "#1B9E75", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Tag size={14} strokeWidth={2} />
            Nhập mã giảm giá
          </button>
        ) : (
          <CouponInput
            communityId={communityId}
            refType="cart"
            orderAmountVnd={total}
            lineItems={products.map((p) => ({ productId: p.id, amountVnd: p.priceVnd }))}
            applied={applied}
            onApply={(r) => setApplied({ couponId: r.couponId, couponCode: r.couponCode, discountVnd: r.discountVnd, finalAmountVnd: r.finalAmountVnd })}
            onClear={() => { setApplied(null); setShowCoupon(false); }}
          />
        )}
      </div>

      {applied && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, marginBottom: 12 }}>
          <span style={{ color: "var(--text-muted)" }}>Sau giảm giá</span>
          <span style={{ fontWeight: 700, color: "var(--brand-green)" }}>{fmtVnd(finalAmount)}đ</span>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleCheckout}
        style={{
          width: "100%", padding: "13px 20px",
          background: loading ? "var(--text-muted)" : "var(--brand-green)",
          color: "#fff", border: "none", borderRadius: 10,
          fontWeight: 700, fontSize: "var(--text-md)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Đang xử lý..." : finalAmount === 0 ? "Nhận miễn phí →" : "Thanh toán →"}
      </button>
    </div>
  );
}

export function CartIcon({ compact }: { compact?: boolean }) {
  const ids = useCartIds();
  const count = ids.length;

  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<CartProductInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);

  const idsKey = ids.join(",");

  useEffect(() => {
    if (!open || ids.length === 0) { setProducts([]); return; }
    setLoading(true);
    getCartProductsAction(ids).then((data) => { setProducts(data); setLoading(false); });
  }, [open, idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      bottom: window.innerHeight - rect.top + 8,
      left: Math.max(8, rect.left - 360 + rect.width),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!compact || count === 0) return null;

  const communitySlug = products[0]?.communitySlug;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={`Giỏ hàng · ${count} sản phẩm`}
        className="up-action"
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        <ShoppingCart size={20} />
        <span style={{
          position: "absolute", top: 2, right: 2,
          background: "var(--brand-green)", color: "#fff",
          borderRadius: "50%", fontSize: 9, minWidth: 14, height: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, lineHeight: 1, padding: "0 2px",
        }}>
          {count > 9 ? "9+" : count}
        </span>
      </button>

      {open && pos && createPortal(
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            bottom: pos.bottom,
            left: pos.left,
            width: 420,
            background: "var(--bg-card)",
            borderRadius: 20,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--header-primary)" }}>
              Giỏ hàng ({count} sản phẩm)
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--bg-elevated)", border: "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "var(--text-muted)",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              Đang tải...
            </div>
          ) : (
            <CartPopupContent
              products={products}
              communitySlug={communitySlug}
              onClose={() => setOpen(false)}
              onRemoved={(id) => setProducts((prev) => prev.filter((x) => x.id !== id))}
            />
          )}
        </div>,
        document.body
      )}
    </>
  );
}
