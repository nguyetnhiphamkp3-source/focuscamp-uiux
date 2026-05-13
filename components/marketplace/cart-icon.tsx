"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { parseCart } from "@/lib/cart";

export function CartIcon() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function readCart() {
      const raw = document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("fc_cart="))
        ?.replace("fc_cart=", "");
      setCount(parseCart(raw ? decodeURIComponent(raw) : undefined).length);
    }
    readCart();
    window.addEventListener("focus", readCart);
    window.addEventListener("cartUpdated", readCart);
    return () => {
      window.removeEventListener("focus", readCart);
      window.removeEventListener("cartUpdated", readCart);
    };
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/cart"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        padding: "8px 12px",
        background: "var(--bg-secondary)",
        color: "var(--brand-green)",
        border: "1px solid var(--brand-green)",
        borderRadius: 8,
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        fontFamily: "var(--font-heading)",
        textDecoration: "none",
      }}
    >
      🛒 View Cart · {count} {count === 1 ? "item" : "items"}
    </Link>
  );
}
