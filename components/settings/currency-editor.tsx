"use client";

import { useState, useTransition } from "react";
import { updateCurrencyAction } from "@/app/actions/community-settings";
import type { GemsConfig } from "@/lib/community-config";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

export function CurrencyEditor({
  communityId,
  communitySlug,
  initial,
  disabled = false,
}: {
  communityId: string;
  communitySlug: string;
  initial: GemsConfig;
  disabled?: boolean;
}) {
  const [currencyName, setName] = useState(initial.currencyName);
  const [currencyIcon, setIcon] = useState(initial.currencyIcon);
  const [gemsName, setGemsName] = useState(initial.gemsName ?? "");
  const [gemsIcon, setGemsIcon] = useState(initial.gemsIcon ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateCurrencyAction({
        communityId,
        communitySlug,
        currency: { currencyName, currencyIcon, gemsName, gemsIcon },
      });
      if (res.ok) setSaved(true);
      else setErr(res.reason);
    });
  }

  const canSave =
    currencyName.trim().length > 0 && currencyIcon.trim().length > 0 && !disabled;

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)", opacity: disabled ? 0.5 : 1 }}
    >
      <SectionHeader
        title="Currency"
        subtitle="Tên + icon của đồng điểm chính của cộng đồng (vd: AIP 💰, Points 💎, Stars ⭐)."
      />

      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Tên đồng điểm chính *
          </span>
          <input
            type="text"
            value={currencyName}
            onChange={(e) => setName(e.target.value)}
            placeholder="AIP"
            maxLength={30}
            style={inputStyle}
            disabled={disabled || pending}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Icon *
          </span>
          <input
            type="text"
            value={currencyIcon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="💰"
            maxLength={4}
            style={{ ...inputStyle, textAlign: "center" }}
            disabled={disabled || pending}
          />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Đồng phụ (gems / secondary — tuỳ chọn)
          </span>
          <input
            type="text"
            value={gemsName}
            onChange={(e) => setGemsName(e.target.value)}
            placeholder="Gems"
            maxLength={30}
            style={inputStyle}
            disabled={disabled || pending}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Icon
          </span>
          <input
            type="text"
            value={gemsIcon}
            onChange={(e) => setGemsIcon(e.target.value)}
            placeholder="💎"
            maxLength={4}
            style={{ ...inputStyle, textAlign: "center" }}
            disabled={disabled || pending}
          />
        </label>
      </div>

      {!disabled && (
        <div style={{ display: "flex", marginTop: 12 }}>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave || pending}
            style={{
              ...btnPrimary,
              marginLeft: "auto",
              opacity: !canSave || pending ? 0.6 : 1,
              cursor: !canSave || pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      )}

      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
