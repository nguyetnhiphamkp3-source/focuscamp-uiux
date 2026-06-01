"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutCartAction } from "@/app/actions/cart";
import { CouponInput, type CouponApplied } from "@/components/checkout/coupon-input";

type Props = {
  communityId?: string;
  totalVnd: number;
  lineItems: { productId: string; amountVnd: number }[];
};

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

export function CartCheckoutButton({ communityId, totalVnd, lineItems }: Props) {
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState<CouponApplied | null>(null);
  const router = useRouter();

  async function handleCheckout() {
    setLoading(true);
    const res = await checkoutCartAction(undefined, {
      couponCode: applied?.couponCode,
    });
    if (res.ok) {
      router.push(`/pay/${res.paymentCode}`);
    } else {
      alert("Lỗi thanh toán: " + res.reason);
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {communityId && (
        <CouponInput
          communityId={communityId}
          refType="cart"
          orderAmountVnd={totalVnd}
          lineItems={lineItems}
          applied={applied}
          onApply={(r) =>
            setApplied({
              couponId: r.couponId,
              couponCode: r.couponCode,
              discountVnd: r.discountVnd,
              finalAmountVnd: r.finalAmountVnd,
            })
          }
          onClear={() => setApplied(null)}
        />
      )}
      {applied && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "var(--text-sm)",
            padding: "8px 12px",
            background: "var(--bg-elevated)",
            borderRadius: 8,
          }}
        >
          <span style={{ color: "var(--text-muted)" }}>Sau giảm giá</span>
          <span style={{ fontWeight: 700, color: "var(--brand-green)" }}>
            {fmtVnd(applied.finalAmountVnd)}
          </span>
        </div>
      )}
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
    </div>
  );
}
