"use client";

import { useState, useTransition } from "react";
import { applyCouponAction, type ApplyCouponSuccess } from "@/app/actions/coupon";

export type CouponApplied = {
  couponId: string;
  couponCode: string;
  discountVnd: number;
  finalAmountVnd: number;
};

type Props = {
  communityId: string;
  refType: "product" | "challenge" | "cart" | "event";
  orderAmountVnd: number;
  applied: CouponApplied | null;
  onApply: (result: ApplyCouponSuccess) => void;
  onClear: () => void;
};

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

export function CouponInput({
  communityId,
  refType,
  orderAmountVnd,
  applied,
  onApply,
  onClear,
}: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleApply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError("Nhập mã coupon");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await applyCouponAction({
        code: trimmed,
        communityId,
        refType,
        orderAmountVnd,
      });
      if (res.ok) {
        onApply(res);
        setCode("");
      } else {
        setError(res.message);
      }
    });
  }

  function handleClear() {
    onClear();
    setError(null);
  }

  if (applied) {
    return (
      <div
        style={{
          padding: "10px 12px",
          background: "rgba(27, 158, 117, 0.08)",
          border: "1px solid rgba(27, 158, 117, 0.3)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontSize: "var(--text-sm)",
        }}
      >
        <div>
          <div style={{ fontWeight: 600, color: "var(--brand-green)" }}>
            Đã áp dụng: {applied.couponCode}
          </div>
          <div style={{ color: "var(--text-muted)", marginTop: 2 }}>
            Giảm {fmtVnd(applied.discountVnd)}
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            textDecoration: "underline",
          }}
        >
          Xoá mã
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
          }}
          placeholder="Mã giảm giá"
          disabled={pending}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontSize: "var(--text-base)",
            textTransform: "uppercase",
          }}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={pending || !code.trim()}
          style={{
            padding: "10px 16px",
            background: pending ? "var(--text-muted)" : "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: pending || !code.trim() ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "..." : "Áp dụng"}
        </button>
      </div>
      {error && (
        <div style={{ color: "var(--danger)", fontSize: "var(--text-xs)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
