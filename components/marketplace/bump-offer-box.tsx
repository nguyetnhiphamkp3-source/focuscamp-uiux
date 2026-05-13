"use client";

import { useState, useTransition } from "react";
import { addBumpToPaymentAction } from "@/app/actions/marketplace";
import { fmtVnd } from "@/components/marketplace/product-card";

export function BumpOfferBox({
  currentPaymentCode,
  bumpProduct,
  returnUrl,
}: {
  currentPaymentCode: string;
  bumpProduct: { id: string; title: string; priceVnd: number; description: string | null };
  returnUrl: string | null;
}) {
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.checked || pending) return;
    setChecked(true);
    setErr(null);
    start(async () => {
      const res = await addBumpToPaymentAction({
        currentPaymentCode,
        bumpProductId: bumpProduct.id,
      });
      if (res.ok) {
        const dest = returnUrl
          ? `/pay/${res.newPaymentCode}?return=${encodeURIComponent(returnUrl)}`
          : `/pay/${res.newPaymentCode}`;
        window.location.href = dest;
      } else {
        setChecked(false);
        setErr(res.reason === "bump_already_added" ? "Bump đã được thêm." : "Không thể thêm bump: " + res.reason);
      }
    });
  }

  return (
    <div
      style={{
        border: "2px dashed var(--brand-green)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          color: "var(--brand-green)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        ⚡ Nâng cấp đơn hàng
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          cursor: pending ? "not-allowed" : "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={pending}
          style={{ marginTop: 2, flexShrink: 0 }}
        />
        <div>
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text-heading)",
            }}
          >
            {bumpProduct.title}
          </span>
          {" — "}
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--brand-green)",
            }}
          >
            {bumpProduct.priceVnd > 0 ? `+${fmtVnd(bumpProduct.priceVnd)}đ` : "Miễn phí"}
          </span>
          {bumpProduct.description && (
            <p
              style={{
                marginTop: 4,
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              {bumpProduct.description}
            </p>
          )}
        </div>
      </label>

      {pending && (
        <p style={{ marginTop: 8, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Đang xử lý…
        </p>
      )}

      {err && (
        <p style={{ marginTop: 8, fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {err}
        </p>
      )}
    </div>
  );
}
