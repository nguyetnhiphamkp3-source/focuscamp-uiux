"use client";

import { useState, useTransition } from "react";
import { removeBumpFromPaymentAction } from "@/app/actions/marketplace";
import { fmtVnd } from "@/components/marketplace/product-card";

export function RemovableBumpRow({
  title,
  priceVnd,
  currentPaymentCode,
  returnUrl,
}: {
  title: string;
  priceVnd: number;
  currentPaymentCode: string;
  returnUrl: string | null;
}) {
  const [checked, setChecked] = useState(true);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleUncheck() {
    if (pending) return;
    setChecked(false);
    setErr(null);
    start(async () => {
      const res = await removeBumpFromPaymentAction({ currentPaymentCode });
      if (res.ok) {
        const dest = returnUrl
          ? `/pay/${res.newPaymentCode}?return=${encodeURIComponent(returnUrl)}`
          : `/pay/${res.newPaymentCode}`;
        window.location.href = dest;
      } else {
        setChecked(true);
        setErr("Không thể bỏ bump: " + res.reason);
      }
    });
  }

  return (
    <div style={{ opacity: pending ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => { if (!e.target.checked) handleUncheck(); }}
            disabled={pending}
            style={{ flexShrink: 0, width: 14, height: 14 }}
          />
          <span style={{ fontSize: 13, color: "var(--text-body)" }}>+ {title}</span>
        </label>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-heading)", whiteSpace: "nowrap" }}>
          {fmtVnd(priceVnd)}đ
        </span>
      </div>
      {pending && (
        <p style={{ margin: "3px 0 0 20px", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Đang bỏ nâng cấp…
        </p>
      )}
      {err && (
        <p style={{ margin: "3px 0 0 20px", fontSize: "var(--text-xs)", color: "var(--danger)" }}>
          {err}
        </p>
      )}
    </div>
  );
}
