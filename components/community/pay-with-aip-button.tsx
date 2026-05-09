"use client";

import { useState } from "react";
import { payWithAipForChallengeAction } from "@/app/actions/challenge-review";
import { useRouter } from "next/navigation";

export function PayWithAipButton({
  challengeId,
  communityId,
  communitySlug,
  challengeSlug,
  requiresApproval,
  aipPrice,
  aipBalance,
}: {
  challengeId: string;
  communityId: string;
  communitySlug: string;
  challengeSlug: string;
  requiresApproval: boolean;
  aipPrice: number;
  aipBalance: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await payWithAipForChallengeAction({
      challengeId,
      communityId,
      communitySlug,
      challengeSlug,
      requiresApproval,
    });
    if (result.ok) {
      router.refresh();
    } else {
      setError(result.reason === "insufficient_aip" ? "Không đủ AIP" : "Lỗi, thử lại sau");
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px 20px",
          background: "rgba(251,191,36,0.12)",
          border: "1px solid rgba(251,191,36,0.4)",
          borderRadius: 10,
          color: "var(--warning)",
          fontWeight: 700,
          fontSize: "var(--text-sm)",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Đang xử lý…" : `Trả bằng AIP — ${aipPrice.toLocaleString("vi-VN")} AIP`}
      </button>
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "right" }}>
        Số dư: {aipBalance.toLocaleString("vi-VN")} AIP
      </div>
      {error && <div style={{ fontSize: "var(--text-xs)", color: "var(--danger)" }}>{error}</div>}
    </div>
  );
}
