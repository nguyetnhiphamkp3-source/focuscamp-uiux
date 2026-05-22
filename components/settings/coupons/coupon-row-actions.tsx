"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleCouponActiveAction,
  deleteCouponAction,
} from "@/app/actions/coupons-admin";

type Props = {
  communityId: string;
  couponId: string;
  isActive: boolean;
  redemptionsUsed: number;
};

export function CouponRowActions({
  communityId,
  couponId,
  isActive,
  redemptionsUsed,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleCouponActiveAction({
        communityId,
        couponId,
        isActive: !isActive,
      });
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Xoá coupon này? Không thể hoàn tác.")) return;
    startTransition(async () => {
      const res = await deleteCouponAction({ communityId, couponId });
      if (!res.ok) alert(res.reason);
      else router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        onClick={handleToggle}
        disabled={pending}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: "var(--text-xs)",
          cursor: pending ? "not-allowed" : "pointer",
          color: isActive ? "var(--warning)" : "var(--brand-green)",
        }}
      >
        {isActive ? "Tắt" : "Bật"}
      </button>
      {redemptionsUsed === 0 && (
        <button
          onClick={handleDelete}
          disabled={pending}
          style={{
            background: "transparent",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: "var(--text-xs)",
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          Xoá
        </button>
      )}
    </div>
  );
}
