"use client";

import { useState, type CSSProperties } from "react";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import {
  PROVIDER_MODELS,
  defaultModelForProvider,
  type AIProviderType,
} from "@/lib/constants/ai-providers";
import type { AIProviderClient } from "@/lib/services/ai-provider";

interface AIReviewSettingsProps {
  enabled: boolean;
  threshold: number;
  fallback: string;
  providers: AIProviderClient[];
  providerId: string | null;
  model: string | null;
  pendingCount: number;
  onChange: (fields: {
    aiReviewEnabled?: boolean;
    aiReviewThreshold?: number;
    aiReviewFallback?: string;
    aiReviewProviderId?: string | null;
    aiReviewModel?: string | null;
  }) => void;
}

export function AIReviewSettings({
  enabled,
  threshold,
  fallback,
  providers,
  providerId,
  model,
  pendingCount,
  onChange,
}: AIReviewSettingsProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const enabledProviders = providers.filter((provider) => provider.enabled);
  const currentProvider = enabledProviders.find((provider) => provider.id === providerId);
  const hasOverride = !!providerId;
  const currentModel =
    model ??
    (currentProvider ? defaultModelForProvider(currentProvider.providerType) : null) ??
    "";

  function handleToggle(checked: boolean) {
    if (checked && pendingCount > 0) {
      setShowConfirm(true);
    } else {
      onChange({ aiReviewEnabled: checked });
    }
  }

  function confirmEnable() {
    setShowConfirm(false);
    onChange({ aiReviewEnabled: true });
  }

  function chooseProvider(nextProviderId: string) {
    const provider = enabledProviders.find((item) => item.id === nextProviderId);
    onChange({
      aiReviewProviderId: nextProviderId || null,
      aiReviewModel: provider ? defaultModelForProvider(provider.providerType) : null,
    });
  }

  function addOverride() {
    const provider = enabledProviders[0];
    if (!provider) return;
    onChange({
      aiReviewProviderId: provider.id,
      aiReviewModel: defaultModelForProvider(provider.providerType),
    });
  }

  function clearOverride() {
    onChange({ aiReviewProviderId: null, aiReviewModel: null });
  }

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        title="Bật AI Review?"
        message={`Hiện có **${pendingCount} bài chưa duyệt**. AI sẽ tự động quét các bài này và tiêu hao token tương ứng.\n\nBài nộp mới từ bây giờ cũng sẽ được AI duyệt tự động.`}
        confirmLabel="Bật AI Review"
        cancelLabel="Huỷ"
        onConfirm={confirmEnable}
        onCancel={() => setShowConfirm(false)}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--header-primary)" }}>
          AI Review
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
          />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>
            Bật AI tự động duyệt submission
          </span>
        </label>

        {enabled && (
          <>
            <label style={labelStyle}>
              Ngưỡng tin cậy
              <select
                value={threshold}
                onChange={(e) => onChange({ aiReviewThreshold: parseFloat(e.target.value) })}
                style={inputStyle}
              >
                <option value="0.6">60% - Rất thoải mái</option>
                <option value="0.7">70% - Thoải mái</option>
                <option value="0.8">80% - Cân bằng</option>
                <option value="0.9">90% - Nghiêm ngặt</option>
              </select>
            </label>

            <label style={labelStyle}>
              Khi AI không chắc chắn
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={radioStyle}>
                  <input
                    type="radio"
                    name="fallback"
                    value="FLAG"
                    checked={fallback === "FLAG"}
                    onChange={(e) => onChange({ aiReviewFallback: e.target.value })}
                  />
                  Flag cho admin
                </label>
                <label style={radioStyle}>
                  <input
                    type="radio"
                    name="fallback"
                    value="REJECT"
                    checked={fallback === "REJECT"}
                    onChange={(e) => onChange({ aiReviewFallback: e.target.value })}
                  />
                  Auto-reject
                </label>
              </div>
            </label>

            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Provider override (empty = community Agent review default)
                </span>
                {hasOverride && (
                  <button type="button" onClick={clearOverride} style={smallButtonStyle}>
                    Clear
                  </button>
                )}
              </div>

              {!hasOverride ? (
                <>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Đang dùng review brain mặc định của community Agent.
                  </div>
                  <button
                    type="button"
                    onClick={addOverride}
                    disabled={enabledProviders.length === 0}
                    style={{ ...smallButtonStyle, width: "fit-content", opacity: enabledProviders.length === 0 ? 0.5 : 1 }}
                  >
                    + Thêm override
                  </button>
                  {enabledProviders.length === 0 && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      Chưa có AI Provider nào trong Community Settings.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <label style={labelStyle}>
                    Provider
                    <select
                      value={providerId ?? ""}
                      onChange={(e) => chooseProvider(e.target.value)}
                      style={inputStyle}
                    >
                      {enabledProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.displayName} ({provider.providerLabel})
                        </option>
                      ))}
                    </select>
                  </label>
                  {currentProvider && (
                    <label style={labelStyle}>
                      Model
                      <ModelInput
                        providerType={currentProvider.providerType}
                        value={currentModel}
                        onChange={(nextModel) => onChange({ aiReviewModel: nextModel })}
                      />
                    </label>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ModelInput({
  providerType,
  value,
  onChange,
}: {
  providerType: AIProviderType;
  value: string;
  onChange: (value: string) => void;
}) {
  if (providerType === "openaiCompatible") {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="krr/claude-haiku-4-5-20251001"
        style={inputStyle}
      />
    );
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      {PROVIDER_MODELS[providerType].map((model) => (
        <option key={model.value} value={model.value}>
          {model.label}
        </option>
      ))}
    </select>
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: "var(--text-xs)",
  color: "var(--text-muted)",
};

const radioStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: "var(--text-sm)",
  color: "var(--text-normal)",
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: 8,
};

const smallButtonStyle: CSSProperties = {
  fontSize: "var(--text-xs)",
  padding: "4px 10px",
  borderRadius: 5,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-elevated)",
  cursor: "pointer",
  color: "var(--text-normal)",
};
