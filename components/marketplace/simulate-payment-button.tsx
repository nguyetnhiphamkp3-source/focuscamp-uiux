"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { simulatePaymentCompletedAction } from "@/app/actions/marketplace";

export function SimulatePaymentButton({ paymentCode }: { paymentCode: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (!confirm("Giả lập thanh toán thành công? (Chỉ dùng để test)")) return;
    setLoading(true);
    const res = await simulatePaymentCompletedAction(paymentCode);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Lỗi: " + res.reason);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        width: "100%",
        marginTop: 12,
        padding: "10px 16px",
        background: "transparent",
        border: "1px dashed var(--border-subtle)",
        borderRadius: 8,
        color: "var(--text-muted)",
        fontSize: "var(--text-sm)",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Đang xử lý..." : "🧪 Giả lập thanh toán thành công (owner only)"}
    </button>
  );
}
