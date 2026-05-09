"use client";

import { useState } from "react";
import type { PricingConfig } from "@/lib/services/pricing";

type Props = {
  value: PricingConfig | null;
  onChange: (config: PricingConfig | null) => void;
  tiers?: { key: string; label: string }[];
};

function numOrEmpty(v: number | undefined): string {
  return v !== undefined ? String(v) : "";
}

export function ChallengePricingEditor({ value, onChange, tiers = [] }: Props) {
  const [enabled, setEnabled] = useState(!!value);
  const [guestVnd, setGuestVnd] = useState(numOrEmpty(value?.guestVnd));
  const [memberVnd, setMemberVnd] = useState(numOrEmpty(value?.memberVnd));
  const [aipEnabled, setAipEnabled] = useState(value?.aipEnabled ?? false);
  const [aipPrice, setAipPrice] = useState(numOrEmpty(value?.aipPrice));
  const [tierPrices, setTierPrices] = useState<Record<string, string>>(
    () => Object.fromEntries(tiers.map((t) => [t.key, numOrEmpty(value?.tierPrices?.[t.key])]))
  );

  function emit(overrides: Partial<{
    enabled: boolean; guestVnd: string; memberVnd: string;
    aipEnabled: boolean; aipPrice: string; tierPrices: Record<string, string>;
  }> = {}) {
    const e = overrides.enabled ?? enabled;
    if (!e) { onChange(null); return; }
    const g = overrides.guestVnd ?? guestVnd;
    const m = overrides.memberVnd ?? memberVnd;
    const ae = overrides.aipEnabled ?? aipEnabled;
    const ap = overrides.aipPrice ?? aipPrice;
    const tp = overrides.tierPrices ?? tierPrices;
    const config: PricingConfig = {
      ...(g !== "" ? { guestVnd: Number(g) } : {}),
      ...(m !== "" ? { memberVnd: Number(m) } : {}),
      ...(ae && ap !== "" ? { aipEnabled: true, aipPrice: Number(ap) } : { aipEnabled: false }),
      tierPrices: Object.fromEntries(
        Object.entries(tp).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])
      ),
    };
    onChange(config);
  }

  const inputStyle = {
    width: "100%", padding: "8px 12px",
    background: "var(--bg-input)", border: "1px solid var(--border-subtle)",
    borderRadius: 8, color: "var(--text-normal)", fontSize: "var(--text-sm)",
  };
  const labelStyle = { fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4, display: "block" as const };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setEnabled(e.target.checked); emit({ enabled: e.target.checked }); }}
        />
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", fontWeight: 600 }}>
          Tính phí tham gia
        </span>
      </label>

      {enabled && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", paddingLeft: 4 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
            <div>
              <label style={labelStyle}>Giá người ngoài (đ)</label>
              <input
                type="number" min={0} style={inputStyle}
                value={guestVnd}
                onChange={(e) => { setGuestVnd(e.target.value); emit({ guestVnd: e.target.value }); }}
                placeholder="0 = miễn phí"
              />
            </div>
            <div>
              <label style={labelStyle}>Giá member (đ)</label>
              <input
                type="number" min={0} style={inputStyle}
                value={memberVnd}
                onChange={(e) => { setMemberVnd(e.target.value); emit({ memberVnd: e.target.value }); }}
                placeholder="Bỏ trống = dùng giá người ngoài"
              />
            </div>
          </div>

          {tiers.length > 0 && (
            <div>
              <label style={labelStyle}>Giá theo tier (bỏ trống = dùng giá member)</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--space-2)" }}>
                {tiers.map((t) => (
                  <div key={t.key}>
                    <label style={labelStyle}>{t.label} (đ)</label>
                    <input
                      type="number" min={0} style={inputStyle}
                      value={tierPrices[t.key] ?? ""}
                      onChange={(e) => {
                        const next = { ...tierPrices, [t.key]: e.target.value };
                        setTierPrices(next);
                        emit({ tierPrices: next });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-3)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
              <input
                type="checkbox" checked={aipEnabled}
                onChange={(e) => { setAipEnabled(e.target.checked); emit({ aipEnabled: e.target.checked }); }}
              />
              <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>
                Cho phép thanh toán bằng AIP
              </span>
            </label>
            {aipEnabled && (
              <div style={{ maxWidth: 180 }}>
                <label style={labelStyle}>Giá AIP</label>
                <input
                  type="number" min={0} style={inputStyle}
                  value={aipPrice}
                  onChange={(e) => { setAipPrice(e.target.value); emit({ aipPrice: e.target.value }); }}
                  placeholder="Số AIP cần trả"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
