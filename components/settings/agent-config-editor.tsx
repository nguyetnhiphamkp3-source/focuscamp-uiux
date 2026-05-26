"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updateAgentSystemPromptAction,
  updateAgentApiKeyAction,
  updateAgentProviderAction,
  updateAgentModelAction,
} from "@/app/actions/agent";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

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

const API_KEY_PLACEHOLDER: Record<Provider, string> = {
  anthropic: "sk-ant-api03-...",
  openai: "sk-proj-...",
  groq: "gsk_...",
  xai: "xai-...",
  google: "AIza...",
};

const API_KEY_DOCS: Record<Provider, string> = {
  anthropic: "console.anthropic.com",
  openai: "platform.openai.com/api-keys",
  groq: "console.groq.com/keys",
  xai: "console.x.ai",
  google: "aistudio.google.com/apikey",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "var(--input-background)",
  border: "1px solid var(--input-border)",
  borderRadius: 4,
  color: "var(--text-normal)",
  fontSize: "var(--text-base)",
  outline: "none",
  cursor: "pointer",
};

type ValidateStatus = "idle" | "checking" | "valid" | "error";

export function AgentConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: {
    prompt: string;
    hasApiKey: boolean;
    provider: Provider;
    model: string | null;
  };
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initial.prompt);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<Provider>(initial.provider);
  const [model, setModel] = useState<string>(
    initial.model ?? MODELS_BY_PROVIDER[initial.provider][0].value,
  );

  // Prompt save state
  const [promptPending, startPrompt] = useTransition();
  const [promptErr, setPromptErr] = useState<string | null>(null);
  const [promptSaved, setPromptSaved] = useState(false);

  // Config save state (provider + model + API key)
  const [savePending, startSave] = useTransition();
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saveSaved, setSaveSaved] = useState(false);

  // Model validation state
  const [validateStatus, setValidateStatus] = useState<ValidateStatus>("idle");
  const [validateError, setValidateError] = useState<string | null>(null);

  function handleProviderChange(p: Provider) {
    setProvider(p);
    // Reset model to first option for new provider
    setModel(MODELS_BY_PROVIDER[p][0].value);
    // Reset validation when provider changes
    setValidateStatus("idle");
    setValidateError(null);
    setSaveSaved(false);
  }

  function handleModelChange(m: string) {
    setModel(m);
    // Reset validation when model changes
    setValidateStatus("idle");
    setValidateError(null);
    setSaveSaved(false);
  }

  const validateModel = useCallback(async () => {
    setValidateStatus("checking");
    setValidateError(null);
    try {
      const res = await fetch("/api/agent/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          provider,
          model,
          // Send the new API key if user typed one, otherwise endpoint uses stored key
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setValidateStatus("valid");
      } else {
        setValidateStatus("error");
        setValidateError(data.error || "Kiểm tra thất bại");
      }
    } catch {
      setValidateStatus("error");
      setValidateError("Không thể kết nối server");
    }
  }, [communityId, provider, model, apiKey]);

  function submitConfig() {
    setSaveErr(null);
    setSaveSaved(false);
    startSave(async () => {
      // Save provider + model always
      const [pRes, mRes] = await Promise.all([
        updateAgentProviderAction({ communityId, communitySlug, provider }),
        updateAgentModelAction({ communityId, communitySlug, model }),
      ]);
      if (!pRes.ok) { setSaveErr(pRes.reason); return; }
      if (!mRes.ok) { setSaveErr(mRes.reason); return; }

      // Save API key only if user entered a new one
      if (apiKey.trim()) {
        const kRes = await updateAgentApiKeyAction({ communityId, communitySlug, apiKey });
        if (!kRes.ok) { setSaveErr(kRes.reason); return; }
        setApiKey("");
      }

      setSaveSaved(true);
      router.refresh();
    });
  }

  function submitPrompt() {
    setPromptErr(null);
    setPromptSaved(false);
    startPrompt(async () => {
      const res = await updateAgentSystemPromptAction({ communityId, communitySlug, prompt });
      if (res.ok) {
        setPromptSaved(true);
        router.refresh();
      } else {
        setPromptErr(res.reason);
      }
    });
  }

  const availableModels = MODELS_BY_PROVIDER[provider];

  const checkBtnStyle: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 4,
    border: "1px solid var(--input-border)",
    fontSize: "var(--text-base)",
    fontWeight: 600,
    whiteSpace: "nowrap",
    cursor: validateStatus === "checking" ? "not-allowed" : "pointer",
    opacity: validateStatus === "checking" ? 0.6 : 1,
    transition: "all 0.15s ease",
    ...(validateStatus === "valid"
      ? { background: "var(--success, #1B9E75)", color: "#fff", borderColor: "var(--success, #1B9E75)" }
      : validateStatus === "error"
        ? { background: "transparent", color: "var(--danger, #e53e3e)", borderColor: "var(--danger, #e53e3e)" }
        : { background: "var(--background-secondary)", color: "var(--text-normal)", borderColor: "var(--input-border)" }),
  };

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="AI Agent"
        subtitle="Cấu hình provider, model, API key và system prompt cho Agent của cộng đồng."
      />

      {/* Provider + Model */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <label
          style={{
            display: "block",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--header-primary)",
            marginBottom: 6,
          }}
        >
          Provider & Model
        </label>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as Provider)}
            disabled={savePending}
            style={{ ...selectStyle, flex: "0 0 200px" }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={savePending}
            style={{ ...selectStyle, flex: 1 }}
          >
            {availableModels.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={validateModel}
            disabled={validateStatus === "checking"}
            style={checkBtnStyle}
            title="Kiểm tra model hoạt động với API key hiện tại"
          >
            {validateStatus === "checking"
              ? "Đang kiểm tra…"
              : validateStatus === "valid"
                ? "✓ Hợp lệ"
                : "Kiểm tra"}
          </button>
        </div>
        {validateStatus === "error" && validateError && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--danger, #e53e3e)",
              marginTop: 4,
              display: "flex",
              alignItems: "flex-start",
              gap: 4,
            }}
          >
            <span style={{ flexShrink: 0 }}>✗</span>
            <span>{validateError}</span>
          </div>
        )}
        {validateStatus === "valid" && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--success, #1B9E75)",
              marginTop: 4,
            }}
          >
            ✓ Model hoạt động bình thường
          </div>
        )}
      </div>

      {/* API Key */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <label
          style={{
            display: "block",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--header-primary)",
            marginBottom: 6,
          }}
        >
          API Key ({PROVIDERS.find((p) => p.value === provider)?.label})
        </label>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginBottom: 8,
          }}
        >
          {initial.hasApiKey
            ? "✓ Đã lưu API key. Nhập key mới để thay thế."
            : `Chưa có API key. Lấy key tại ${API_KEY_DOCS[provider]}`}
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            setSaveSaved(false);
            // Reset validation when API key changes
            if (validateStatus !== "idle") {
              setValidateStatus("idle");
              setValidateError(null);
            }
          }}
          placeholder={API_KEY_PLACEHOLDER[provider]}
          disabled={savePending}
          style={{ ...inputStyle, width: "100%" }}
        />
      </div>

      {/* Single Save button for provider + model + API key */}
      <div style={{ display: "flex", marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          onClick={submitConfig}
          disabled={savePending}
          style={{
            ...btnPrimary,
            marginLeft: "auto",
            opacity: savePending ? 0.6 : 1,
            cursor: savePending ? "not-allowed" : "pointer",
          }}
        >
          {savePending ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
      <ErrorBox msg={saveErr} />
      <SuccessBox shown={saveSaved} />

      {/* Divider */}
      <div
        style={{
          borderTop: "1px solid var(--background-modifier-accent)",
          margin: "var(--space-4) 0",
        }}
      />

      {/* System Prompt */}
      <label
        style={{
          display: "block",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--header-primary)",
          marginBottom: 6,
        }}
      >
        System Prompt
      </label>
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        Để trống = dùng prompt mặc định.
      </div>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={8}
        maxLength={4000}
        disabled={promptPending}
        placeholder="Bạn là AI Agent của cộng đồng X. Hỗ trợ thành viên về…"
        style={{
          ...inputStyle,
          resize: "vertical",
          fontFamily: "inherit",
          minHeight: 160,
        }}
      />
      <div
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          marginTop: 6,
        }}
      >
        {prompt.length}/4000 ký tự
      </div>
      <div style={{ display: "flex", marginTop: 12 }}>
        <button
          type="button"
          onClick={submitPrompt}
          disabled={promptPending}
          style={{
            ...btnPrimary,
            marginLeft: "auto",
            opacity: promptPending ? 0.6 : 1,
            cursor: promptPending ? "not-allowed" : "pointer",
          }}
        >
          {promptPending ? "Đang lưu…" : "Lưu prompt"}
        </button>
      </div>
      <ErrorBox msg={promptErr} />
      <SuccessBox shown={promptSaved} />
    </section>
  );
}
