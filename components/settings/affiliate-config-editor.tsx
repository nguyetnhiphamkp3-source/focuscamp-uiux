"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAffiliateConfigAction } from "@/app/actions/affiliate";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

export function AffiliateConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: { enabled: boolean; commissionPercent: number; cookieDays: number };
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [commissionPercent, setCommissionPercent] = useState(
    String(initial.commissionPercent),
  );
  const [cookieDays, setCookieDays] = useState(String(initial.cookieDays));
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateAffiliateConfigAction({
        communityId,
        communitySlug,
        enabled,
        commissionPercent: Number(commissionPercent) || 0,
        cookieDays: Number(cookieDays) || 30,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="Affiliate Program"
        subtitle="Cho phép bất kỳ user nào share affiliate link của community này. Product, bump, cart item và paid challenge đều tạo commission row riêng."
      />
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: "10px 12px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={pending}
          style={{ marginTop: 3 }}
        />
        <div>
          <div style={{ fontWeight: 600, color: "var(--header-primary)" }}>
            Bật affiliate program
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Khi tắt, link đã tạo vẫn track click + signup nhưng KHÔNG convert.
          </div>
        </div>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Hoa hồng (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            disabled={pending}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Cookie (ngày)
          </span>
          <input
            type="number"
            min={1}
            max={365}
            value={cookieDays}
            onChange={(e) => setCookieDays(e.target.value)}
            disabled={pending}
            style={inputStyle}
          />
        </label>
      </div>
      <div style={{ display: "flex", marginTop: 12 }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{ ...btnPrimary, marginLeft: "auto", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
