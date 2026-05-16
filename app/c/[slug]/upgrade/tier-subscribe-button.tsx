"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeCommunityTierAction } from "@/app/actions/community";

export function TierSubscribeButton({
  communityId,
  communitySlug,
  tierKey,
  priceVnd,
  durationDays = 30,
  label,
}: {
  communityId: string;
  communitySlug: string;
  tierKey: string;
  priceVnd: number;
  durationDays?: number;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await subscribeCommunityTierAction({
        communityId,
        communitySlug,
        tierKey,
        priceVnd,
        durationDays,
      });
      if (result.ok) {
        router.push(`/pay/${result.paymentCode}?return=/c/${communitySlug}`);
      } else {
        alert("Lỗi: " + result.reason);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      style={{
        width: "100%",
        padding: "10px 0",
        background: pending ? "var(--brand-green-soft)" : "var(--brand-green)",
        color: "#fff",
        border: "none",
        borderRadius: 10,
        fontWeight: 700,
        fontSize: "var(--text-md)",
        cursor: pending ? "not-allowed" : "pointer",
        marginTop: 8,
      }}
    >
      {pending ? "Đang xử lý..." : label}
    </button>
  );
}
