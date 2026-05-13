"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startUpsellPaymentAction } from "@/app/actions/marketplace";

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN");
}

export function UpsellOfferBox({
  upsellProduct,
  returnUrl,
}: {
  upsellProduct: { id: string; title: string; priceVnd: number; description: string | null };
  returnUrl: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleBuy() {
    setLoading(true);
    const res = await startUpsellPaymentAction(upsellProduct.id);
    if (res.ok) {
      const dest = returnUrl
        ? `/pay/${res.paymentCode}?return=${encodeURIComponent(returnUrl)}`
        : `/pay/${res.paymentCode}`;
      router.push(dest);
    } else {
      alert("Lỗi: " + res.reason);
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        border: "2px solid var(--brand-green)",
        borderRadius: 12,
        padding: "16px 18px",
        marginTop: 16,
        background: "var(--brand-green-soft, rgba(27,158,117,0.06))",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--brand-green)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          marginBottom: 10,
        }}
      >
        ✨ Nâng cấp thêm
      </div>
      <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-heading)", marginBottom: 4 }}>
        {upsellProduct.title}
        {" — "}
        <span style={{ color: "var(--brand-green)" }}>
          {upsellProduct.priceVnd > 0 ? `${fmtVnd(upsellProduct.priceVnd)}đ` : "Miễn phí"}
        </span>
      </div>
      {upsellProduct.description && (
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 12px" }}>
          {upsellProduct.description}
        </p>
      )}
      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          width: "100%",
          padding: "11px 16px",
          background: loading ? "var(--text-muted)" : "var(--brand-green)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "var(--text-base)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Đang xử lý..." : `Mua ngay → ${upsellProduct.priceVnd > 0 ? fmtVnd(upsellProduct.priceVnd) + "đ" : "Miễn phí"}`}
      </button>
    </div>
  );
}
