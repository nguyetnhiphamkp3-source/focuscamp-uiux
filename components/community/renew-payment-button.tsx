"use client";

import { useTransition, useState } from "react";
import { renewChallengePaymentAction } from "@/app/actions/challenge-review";

export function RenewPaymentButton({
  challengeId,
  communitySlug,
  challengeSlug,
  originalAmountVnd,
  hasLateFee,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  originalAmountVnd: number;
  hasLateFee: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const lateFee = hasLateFee ? 500_000 : 0;
  const displayAmount = originalAmountVnd + lateFee;

  function handleRenew() {
    setError(null);
    startTransition(async () => {
      const res = await renewChallengePaymentAction({ challengeId, communitySlug, challengeSlug });
      if (!res.ok) { setError(res.reason); return; }
      window.location.href = `/pay/${res.paymentCode}?return=${encodeURIComponent(`/c/${communitySlug}/challenges/${challengeSlug}`)}`;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {hasLateFee ? (
        <div style={{ padding: "12px 16px", background: "rgba(240,178,50,0.08)", border: "1px solid rgba(240,178,50,0.3)", borderRadius: 10, fontSize: "var(--text-sm)", color: "var(--warning)", lineHeight: 1.5 }}>
          ⏰ Đã quá 30 phút kể từ khi đăng ký. Giá cập nhật lên{" "}
          <strong>{displayAmount.toLocaleString("vi-VN")}đ</strong>
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> (+500.000đ phí trễ)</span>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 10, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
          Lệnh thanh toán đã hết hạn. Tạo lệnh mới để tiếp tục — giá vẫn giữ nguyên.
        </div>
      )}
      {error && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--danger)", padding: "6px 10px", background: "rgba(218,55,60,0.08)", borderRadius: 6 }}>
          Lỗi: {error}
        </div>
      )}
      <button
        onClick={handleRenew}
        disabled={pending}
        className="ui-btn ui-btn-primary ui-btn-lg"
        style={{ width: "100%", opacity: pending ? 0.7 : 1, cursor: pending ? "not-allowed" : "pointer" }}
      >
        {pending ? "Đang tạo lệnh…" : `💳 Thanh toán — ${displayAmount.toLocaleString("vi-VN")}đ`}
      </button>
    </div>
  );
}
