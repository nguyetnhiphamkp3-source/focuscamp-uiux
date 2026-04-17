"use client";

import {
  SectionHeader,
} from "./editor-shared";
import type { TierConfigItem } from "@/lib/services/subscription";

/**
 * READ-ONLY view of subscription tiers for admin to see what's configured.
 * Editing tiers (CRUD) = Phase 2. For now admin sees the defaults and knows
 * what gates apply to each tier.
 */
export function TiersViewer({
  tiers,
}: {
  tiers: TierConfigItem[];
}) {
  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="Gói Subscription"
        subtitle="Xem cấu hình tiers — mỗi tier gate tính năng khác nhau. Chỉnh sửa tiers qua Settings > tiersConfig JSON (Phase 2 sẽ có editor CRUD)."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${tiers.length}, 1fr)`,
          gap: 10,
        }}
      >
        {tiers.map((t) => {
          const g = t.gates;
          return (
            <div
              key={t.key}
              style={{
                background: "var(--bg-card)",
                border: t.isFree
                  ? "1px solid var(--border-subtle)"
                  : "2px solid var(--brand-green)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 24 }}>{t.emoji}</span>
                <div>
                  <div
                    style={{
                      fontSize: "var(--text-md)",
                      fontWeight: 700,
                      color: "var(--header-primary)",
                    }}
                  >
                    {t.label}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: t.isFree ? "var(--success)" : "var(--brand-green)",
                      fontWeight: 600,
                    }}
                  >
                    {t.isFree
                      ? "Miễn phí"
                      : t.priceVndMonthly
                        ? `${(t.priceVndMonthly / 1000).toFixed(0)}k/tháng`
                        : "Có phí"}
                  </div>
                </div>
              </div>

              {t.description && (
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    lineHeight: 1.45,
                  }}
                >
                  {t.description}
                </div>
              )}

              {g && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    fontSize: "var(--text-xs)",
                    color: "var(--text-normal)",
                    marginTop: 4,
                  }}
                >
                  <GateRow
                    label="Challenge"
                    value={g.challengeDifficulty?.join(", ") ?? "Tất cả"}
                  />
                  <GateRow
                    label="Course"
                    value={g.courseLevel?.join(", ") ?? "Tất cả"}
                  />
                  <GateRow
                    label="Q&A/tuần"
                    value={g.qaPerWeek !== undefined ? String(g.qaPerWeek) : "∞"}
                  />
                  <GateRow
                    label="Marketplace"
                    value={g.marketplaceDiscount ? `−${g.marketplaceDiscount}%` : "0%"}
                  />
                  <GateRow
                    label="AI Agent"
                    value={g.aiAgentAccess ? "✅" : "❌"}
                  />
                  <GateRow
                    label="Mentor 1-on-1"
                    value={g.mentorBooking ? "✅" : "❌"}
                  />
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "3px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
