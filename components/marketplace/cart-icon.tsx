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
    // Re-read on focus (catches changes from other tabs)
    window.addEventListener("focus", readCart);
    return () => window.removeEventListener("focus", readCart);
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/cart"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "var(--brand-green)",
        color: "#fff",
        borderRadius: 20,
        fontSize: "var(--text-sm)",
        fontWeight: 700,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      🛒 {count}
    </Link>
  );
}
