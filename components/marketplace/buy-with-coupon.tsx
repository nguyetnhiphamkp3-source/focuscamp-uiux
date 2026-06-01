"use client";

import { useState } from "react";
import { CouponInput, type CouponApplied } from "@/components/checkout/coupon-input";

type Props = {
  communityId: string;
  productId: string;
  priceVnd: number;
  buyLabel: string;
  addToCart?: React.ReactNode;
  action: (formData: FormData) => void | Promise<void>;
};

const fmtVnd = (n: number) => n.toLocaleString("vi-VN") + "đ";

export function BuyWithCoupon({ communityId, productId, priceVnd, buyLabel, addToCart, action }: Props) {
  const [applied, setApplied] = useState<CouponApplied | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <CouponInput
        communityId={communityId}
        refType="product"
        orderAmountVnd={priceVnd}
        refId={productId}
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
          <span style={{ fontWeight: "var(--fw-semibold)", color: "var(--brand-green)" }}>
            {fmtVnd(applied.finalAmountVnd)}
          </span>
        </div>
      )}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "stretch" }}>
        <form action={action} style={{ flex: 1 }}>
          <input type="hidden" name="couponCode" value={applied?.couponCode ?? ""} />
          <button
            type="submit"
            className="ui-btn ui-btn-primary ui-btn-lg"
            style={{ width: "100%" }}
          >
            {buyLabel}
          </button>
        </form>
        {addToCart}
      </div>
    </div>
  );
}
