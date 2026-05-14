"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeFromCartAction } from "@/app/actions/cart";

export function RemoveCartItemButton({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function remove() {
    if (pending) return;

    start(async () => {
      await removeFromCartAction(productId);
      window.dispatchEvent(new Event("cartUpdated"));
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={pending}
      aria-label={`Gỡ ${title} khỏi giỏ hàng`}
      title={`Gỡ ${title}`}
      style={{
        width: "var(--space-8)",
        height: "var(--space-8)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        borderRadius: "var(--r-md)",
        border: "1px solid var(--border-subtle)",
        background: "var(--bg-card)",
        color: "var(--text-muted)",
        cursor: pending ? "not-allowed" : "pointer",
        fontSize: "var(--text-md)",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      ×
    </button>
  );
}
