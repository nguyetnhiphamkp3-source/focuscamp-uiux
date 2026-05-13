"use client";

import { useState } from "react";
import { addToCartAction } from "@/app/actions/cart";

export function AddToCartButton({ productId }: { productId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "added" | "error">("idle");

  async function handleClick() {
    setState("loading");
    const res = await addToCartAction(productId);
    if (res.ok) {
      setState("added");
      setTimeout(() => setState("idle"), 2000);
    } else {
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }

  const label =
    state === "loading" ? "..." :
    state === "added" ? "✓ Đã thêm" :
    state === "error" ? "Lỗi" :
    "🛒 Thêm vào giỏ";

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      style={{
        padding: "8px 16px",
        background: state === "added" ? "var(--brand-green)" : "var(--bg-elevated)",
        color: state === "added" ? "#fff" : "var(--text-heading)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: "var(--text-sm)",
        cursor: state === "loading" ? "not-allowed" : "pointer",
        transition: "background 0.15s, color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
