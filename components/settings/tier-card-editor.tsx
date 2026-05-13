"use client";

import { inputStyle, btnDanger } from "./editor-shared";
import type { TierConfigItem } from "@/lib/services/subscription";

const DIFFICULTIES = ["NORMAL", "HARD", "CHAOS"];
const COURSE_LEVELS = ["BASIC", "ADVANCED", "EXPERT"];

type GatePatch = Partial<NonNullable<TierConfigItem["gates"]>>;

export function TierCardEditor({
  tier,
  disabled,
  canDelete,
  onChange,
  onGateChange,
  onDelete,
}: {
  tier: TierConfigItem;
  disabled: boolean;
  canDelete: boolean;
  onChange: (patch: Partial<TierConfigItem>) => void;
  onGateChange: (patch: GatePatch) => void;
  onDelete: () => void;
}) {
  const difficulties = tier.gates?.challengeDifficulty;
  const levels = tier.gates?.courseLevel;

  function toggleDifficulty(d: string) {
    const current = difficulties ?? DIFFICULTIES;
    const next = current.includes(d) ? current.filter((x) => x !== d) : [...current, d];
    onGateChange({ challengeDifficulty: next.length === 0 ? undefined : next });
  }

  function toggleLevel(l: string) {
    const current = levels ?? COURSE_LEVELS;
    const next = current.includes(l) ? current.filter((x) => x !== l) : [...current, l];
    onGateChange({ courseLevel: next.length === 0 ? undefined : next });
  }

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: tier.isFree ? "1px solid var(--border-subtle)" : "2px solid var(--brand-green)",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <input
          style={{ ...inputStyle, width: 42, textAlign: "center" }}
          value={tier.emoji ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ emoji: e.target.value })}
          placeholder="emoji"
        />
        <input
          style={inputStyle}
          value={tier.label}
          disabled={disabled}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Tên tier"
        />
      </div>

      <input
        style={inputStyle}
        value={tier.description ?? ""}
        disabled={disabled}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Mô tả ngắn"
      />

      {!tier.isFree && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Giá/tháng (VND)
          </span>
          <input
            type="number"
            style={{ ...inputStyle, width: 110 }}
            value={tier.priceVndMonthly ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ priceVndMonthly: Number(e.target.value) || undefined })}
            placeholder="0"
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "var(--text-xs)" }}>
        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Challenge</div>
          <div style={{ display: "flex", gap: 10 }}>
            {DIFFICULTIES.map((d) => (
              <label key={d} style={{ display: "flex", alignItems: "center", gap: 3, cursor: disabled ? "default" : "pointer" }}>
                <input
                  type="checkbox"
                  checked={!difficulties || difficulties.includes(d)}
                  disabled={disabled}
                  onChange={() => toggleDifficulty(d)}
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Course</div>
          <div style={{ display: "flex", gap: 10 }}>
            {COURSE_LEVELS.map((l) => (
              <label key={l} style={{ display: "flex", alignItems: "center", gap: 3, cursor: disabled ? "default" : "pointer" }}>
                <input
                  type="checkbox"
                  checked={!levels || levels.includes(l)}
                  disabled={disabled}
                  onChange={() => toggleLevel(l)}
                />
                {l}
              </label>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)" }}>AI Agent</span>
          <input
            type="checkbox"
            checked={!!tier.gates?.aiAgentAccess}
            disabled={disabled}
            onChange={(e) => onGateChange({ aiAgentAccess: e.target.checked })}
          />
        </label>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)" }}>Mentor 1-on-1</span>
          <input
            type="checkbox"
            checked={!!tier.gates?.mentorBooking}
            disabled={disabled}
            onChange={(e) => onGateChange({ mentorBooking: e.target.checked })}
          />
        </label>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)" }}>Marketplace −%</span>
          <input
            type="number"
            min={0}
            max={100}
            style={{ ...inputStyle, width: 60 }}
            value={tier.gates?.marketplaceDiscount ?? 0}
            disabled={disabled}
            onChange={(e) => onGateChange({ marketplaceDiscount: Number(e.target.value) })}
          />
        </label>
        <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "var(--text-muted)" }}>Q&A/tuần (0=∞)</span>
          <input
            type="number"
            min={0}
            style={{ ...inputStyle, width: 60 }}
            value={tier.gates?.qaPerWeek ?? 0}
            disabled={disabled}
            onChange={(e) => onGateChange({ qaPerWeek: Number(e.target.value) || undefined })}
          />
        </label>
      </div>

      {!disabled && canDelete && !tier.isFree && (
        <button style={{ ...btnDanger, marginTop: 4 }} onClick={onDelete}>
          Xoá tier
        </button>
      )}
    </div>
  );
}
