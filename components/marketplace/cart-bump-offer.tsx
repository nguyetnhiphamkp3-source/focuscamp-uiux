"use client";

import { useState, useTransition } from "react";
import { addToCartAction } from "@/app/actions/cart";
import { fmtVnd } from "@/components/marketplace/product-card";

export function CartBumpOffer({
  product,
}: {
  product: { id: string; title: string; priceVnd: number; description: string | null };
}) {
  const [added, setAdded] = useState(false);
  const [pending, start] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.checked || pending || added) return;
    start(async () => {
      const res = await addToCartAction(product.id);
      if (res.ok) {
        setAdded(true);
        window.dispatchEvent(new Event("cartUpdated"));
      }
    });
  }

  return (
    <div
      style={{
        border: "2px dashed var(--brand-green)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          color: "var(--brand-green)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        ⚡ Thêm vào đơn hàng
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: added || pending ? "default" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={added}
          onChange={handleChange}
          disabled={pending || added}
          style={{ flexShrink: 0, width: 16, height: 16 }}
        />
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-heading)" }}>
          {product.title}
        </span>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--brand-green)", marginLeft: 2 }}>
          {product.priceVnd > 0 ? `+${fmtVnd(product.priceVnd)}đ` : "Miễn phí"}
        </span>
      </label>

      {product.description && (
        <p style={{ marginTop: 6, marginLeft: 26, fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.5 }}>
          {product.description}
        </p>
      )}

      {added && (
        <p style={{ marginTop: 8, marginLeft: 26, fontSize: "var(--text-xs)", color: "var(--brand-green)", fontWeight: 600 }}>
          ✓ Đã thêm vào giỏ hàng
        </p>
      )}

      {pending && (
        <p style={{ marginTop: 8, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Đang thêm…
        </p>
      )}
    </div>
  );
}
