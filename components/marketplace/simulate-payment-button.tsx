"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { simulatePaymentCompletedAction } from "@/app/actions/marketplace";
import { ConfirmModal } from "@/components/shared/confirm-modal";

export function SimulatePaymentButton({ paymentCode }: { paymentCode: string }) {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setShowConfirm(true);
  }

  async function confirmSimulate() {
    setShowConfirm(false);
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
    <>
      <ConfirmModal
        open={showConfirm}
        title="Giả lập thanh toán"
        message="Giả lập thanh toán thành công? (Chỉ dùng để test)"
        confirmLabel="Giả lập"
        onConfirm={confirmSimulate}
        onCancel={() => setShowConfirm(false)}
      />
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
    </>
  );
}
