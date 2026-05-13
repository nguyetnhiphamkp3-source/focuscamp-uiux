"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutCartAction } from "@/app/actions/cart";

export function CartCheckoutButton({ productIds }: { productIds: string[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCheckout() {
    setLoading(true);
    const res = await checkoutCartAction(productIds);
    if (res.ok) {
      router.push(`/pay/${res.paymentCode}`);
    } else {
      alert("Lỗi thanh toán: " + res.reason);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      style={{
        width: "100%",
        padding: "13px 20px",
        background: loading ? "var(--text-muted)" : "var(--brand-green)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontWeight: 700,
        fontSize: "var(--text-md)",
        cursor: loading ? "not-allowed" : "pointer",
      }}
    >
      {loading ? "Đang xử lý..." : "Thanh toán →"}
    </button>
  );
}
