"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/shared/confirm-modal";

type Provider = "anthropic" | "openai" | "groq" | "xai" | "google";

const PROVIDERS: { value: Provider; label: string }[] = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "groq", label: "Groq (Fast Inference)" },
  { value: "xai", label: "xAI (Grok)" },
  { value: "google", label: "Google (Gemini)" },
];

const MODELS_BY_PROVIDER: Record<Provider, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5 — nhanh, rẻ" },
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "claude-opus-4-5", label: "Claude Opus 4.5" },
    { value: "claude-opus-4-6", label: "Claude Opus 4.6" },
    { value: "claude-opus-4-7", label: "Claude Opus 4.7 — mạnh nhất" },
  ],
  openai: [
    { value: "gpt-4o-mini", label: "GPT-4o Mini — nhanh, rẻ" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano — rẻ nhất" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "gpt-4.1", label: "GPT-4.1" },
  ],
  groq: [
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant — cực nhanh" },
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
    { value: "qwen/qwen3-32b", label: "Qwen3 32B" },
  ],
  xai: [
    { value: "grok-3-mini", label: "Grok 3 Mini — nhanh" },
    { value: "grok-3", label: "Grok 3" },
    { value: "grok-4", label: "Grok 4 — mạnh nhất" },
  ],
  google: [
    { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — rẻ nhất" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro — mạnh nhất" },
  ],
};

interface AIReviewSettingsProps {
  enabled: boolean;
  threshold: number;
  fallback: string;
  provider: string | null;
  model: string | null;
  pendingCount: number;
  onChange: (fields: {
    aiReviewEnabled?: boolean;
    aiReviewThreshold?: number;
    aiReviewFallback?: string;
    aiReviewProvider?: string | null;
    aiReviewModel?: string | null;
  }) => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-chat)",
  color: "var(--text-normal)",
  fontSize: "var(--text-sm)",
  outline: "none",
};

export function AIReviewSettings({
  enabled,
  threshold,
  fallback,
  provider,
  model,
  pendingCount,
  onChange,
}: AIReviewSettingsProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const currentProvider = (provider as Provider | null) ?? "anthropic";
  const currentModel = model ?? MODELS_BY_PROVIDER[currentProvider][0].value;

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

  function handleProviderChange(newProvider: Provider) {
    onChange({
      aiReviewProvider: newProvider,
      aiReviewModel: MODELS_BY_PROVIDER[newProvider][0].value,
    });
  }

  function handleModelChange(newModel: string) {
    onChange({ aiReviewModel: newModel });
  }

  function clearOverride() {
    onChange({ aiReviewProvider: null, aiReviewModel: null });
  }

  const availableModels = MODELS_BY_PROVIDER[currentProvider];
  const hasOverride = provider !== null;

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        title="Bật AI Review?"
        message={`Hiện có **${pendingCount} bài chưa duyệt**. AI sẽ tự động quét các bài này và tiêu hao token tương ứng.\n\nBài nộp mới từ giờ trở đi cũng sẽ được AI duyệt tự động.`}
        confirmLabel="Bật AI Review"
        cancelLabel="Hủy"
        onConfirm={confirmEnable}
        onCancel={() => setShowConfirm(false)}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 700,
            marginBottom: 0,
            color: "var(--header-primary)",
          }}
        >
          🤖 AI Review
        </div>

        {/* Toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
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
            {/* Threshold */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Ngưỡng tin cậy
              </span>
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

            {/* Fallback */}
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Khi AI không chắc chắn
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="fallback"
                    value="FLAG"
                    checked={fallback === "FLAG"}
                    onChange={(e) => onChange({ aiReviewFallback: e.target.value })}
                  />
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>
                    Flag cho admin
                  </span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="fallback"
                    value="REJECT"
                    checked={fallback === "REJECT"}
                    onChange={(e) => onChange({ aiReviewFallback: e.target.value })}
                  />
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)" }}>
                    Auto-reject
                  </span>
                </label>
              </div>
            </label>

            {/* Model override */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: 12,
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                  Model AI Review (để trống = dùng model cộng đồng)
                </span>
                {hasOverride && (
                  <button
                    type="button"
                    onClick={clearOverride}
                    style={{
                      fontSize: "var(--text-xs)",
                      padding: "3px 10px",
                      borderRadius: 5,
                      border: "1px solid var(--border-subtle)",
                      background: "transparent",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                    }}
                  >
                    Xóa override
                  </button>
                )}
              </div>

              {!hasOverride ? (
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  Đang dùng model cộng đồng
                </div>
              ) : (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      Provider
                    </span>
                    <select
                      value={currentProvider}
                      onChange={(e) => handleProviderChange(e.target.value as Provider)}
                      style={inputStyle}
                    >
                      {PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                      Model
                    </span>
                    <select
                      value={currentModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      style={inputStyle}
                    >
                      {availableModels.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {!hasOverride && (
                <button
                  type="button"
                  onClick={() => handleProviderChange(currentProvider)}
                  style={{
                    fontSize: "var(--text-xs)",
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-elevated)",
                    cursor: "pointer",
                    color: "var(--text-normal)",
                    marginTop: 4,
                  }}
                >
                  + Thêm override
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
