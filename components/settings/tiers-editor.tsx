"use client";

import { useState } from "react";
import { SectionHeader, btnPrimary, btnSecondary } from "./editor-shared";
import { TierCardEditor } from "./tier-card-editor";
import type { TierConfigItem } from "@/lib/services/subscription";
import { updateTiersConfigAction } from "@/app/actions/community";

export function TiersViewer({ tiers }: { tiers: TierConfigItem[] }) {
  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="Gói Subscription"
        subtitle="Xem cấu hình tiers — mỗi tier gate tính năng khác nhau."
      />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${tiers.length}, 1fr)`, gap: 10 }}>
        {tiers.map((t) => {
          const g = t.gates;
          return (
            <div
              key={t.key}
              style={{
                background: "var(--bg-card)",
                border: t.isFree ? "1px solid var(--border-subtle)" : "2px solid var(--brand-green)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 24 }}>{t.emoji}</span>
                <div>
                  <div style={{ fontSize: "var(--text-md)", fontWeight: 700, color: "var(--header-primary)" }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: t.isFree ? "var(--success)" : "var(--brand-green)", fontWeight: 600 }}>
                    {t.isFree ? "Miễn phí" : t.priceVndMonthly ? `${(t.priceVndMonthly / 1000).toFixed(0)}k/tháng` : "Có phí"}
                  </div>
                </div>
              </div>
              {t.description && (
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  {t.description}
                </div>
              )}
              {g && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "var(--text-xs)", color: "var(--text-normal)", marginTop: 4 }}>
                  <GateRow label="Challenge" value={g.challengeDifficulty?.join(", ") ?? "Tất cả"} />
                  <GateRow label="Course" value={g.courseLevel?.join(", ") ?? "Tất cả"} />
                  <GateRow label="Q&A/tuần" value={g.qaPerWeek !== undefined ? String(g.qaPerWeek) : "∞"} />
                  <GateRow label="Marketplace" value={g.marketplaceDiscount ? `−${g.marketplaceDiscount}%` : "0%"} />
                  <GateRow label="AI Agent" value={g.aiAgentAccess ? "✅" : "❌"} />
                  <GateRow label="Mentor 1-on-1" value={g.mentorBooking ? "✅" : "❌"} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function GateRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export function TiersEditor({
  tiers,
  communityId,
  communitySlug,
  disabled = false,
}: {
  tiers: TierConfigItem[];
  communityId: string;
  communitySlug: string;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState<TierConfigItem[]>(tiers);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function updateTier(idx: number, patch: Partial<TierConfigItem>) {
    setLocal((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
    setStatus(null);
  }

  function updateGate(idx: number, patch: Partial<NonNullable<TierConfigItem["gates"]>>) {
    setLocal((prev) => prev.map((t, i) => (i === idx ? { ...t, gates: { ...t.gates, ...patch } } : t)));
    setStatus(null);
  }

  function addTier() {
    setLocal((prev) => [
      ...prev,
      { key: `tier_${Date.now()}`, label: "Tier mới", emoji: "⭐", isFree: false, priceVndMonthly: 0, description: "", gates: {} },
    ]);
    setStatus(null);
  }

  function deleteTier(idx: number) {
    setLocal((prev) => prev.filter((_, i) => i !== idx));
    setStatus(null);
  }

  async function handleSave() {
    setSaving(true);
    const res = await updateTiersConfigAction({ communityId, communitySlug, tiersConfig: local });
    setSaving(false);
    setStatus(res.ok ? "Đã lưu!" : `Lỗi: ${"reason" in res ? res.reason : "unknown"}`);
  }

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="Gói Subscription"
        subtitle="Chỉnh sửa label, giá, tính năng mỗi tier. Lưu để áp dụng ngay."
      />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${local.length}, 1fr)`, gap: 10 }}>
        {local.map((t, idx) => (
          <TierCardEditor
            key={t.key}
            tier={t}
            disabled={disabled}
            canDelete={local.length > 1}
            onChange={(patch) => updateTier(idx, patch)}
            onGateChange={(patch) => updateGate(idx, patch)}
            onDelete={() => deleteTier(idx)}
          />
        ))}
      </div>
      {!disabled && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <button style={btnSecondary} onClick={addTier} disabled={saving}>
            + Thêm tier
          </button>
          <button style={btnPrimary} onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu tiers"}
          </button>
          <button style={btnSecondary} onClick={() => { setLocal(tiers); setStatus(null); }} disabled={saving}>
            Hoàn tác
          </button>
          {status && (
            <span style={{ fontSize: "var(--text-sm)", color: status.startsWith("Lỗi") ? "var(--danger)" : "var(--success)" }}>
              {status}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
