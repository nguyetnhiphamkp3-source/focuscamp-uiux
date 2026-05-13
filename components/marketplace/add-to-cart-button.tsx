"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addToCartAction } from "@/app/actions/cart";
import { parseCart } from "@/lib/cart";

function readFromCookie(productId: string): boolean {
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("fc_cart="))
    ?.replace("fc_cart=", "");
  return parseCart(raw ? decodeURIComponent(raw) : undefined).some(
    (i) => i.productId === productId
  );
}

export function AddToCartButton({ productId }: { productId: string }) {
  const [inCart, setInCart] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInCart(readFromCookie(productId));
  }, [productId]);

  async function handleClick() {
    setLoading(true);
    const res = await addToCartAction(productId);
    setLoading(false);
    if (res.ok) {
      setInCart(true);
      window.dispatchEvent(new Event("cartUpdated"));
    }
  }

  if (inCart) {
    return (
      <Link
        href="/cart"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          padding: "8px 16px",
          background: "var(--brand-green)",
          color: "#fff",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: "var(--text-sm)",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        ✓ Đã thêm · Xem giỏ →
      </Link>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        padding: "8px 16px",
        background: "var(--bg-elevated)",
        color: "var(--text-heading)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: "var(--text-sm)",
        cursor: loading ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {loading ? "..." : "🛒 Thêm vào giỏ"}
    </button>
  );
}
