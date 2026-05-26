"use client";

import { useState, useTransition } from "react";
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
    { value: "o3-mini", label: "o3-mini — reasoning nhẹ" },
    { value: "o4-mini", label: "o4-mini — reasoning" },
    { value: "o1", label: "o1 — reasoning mạnh" },
    { value: "o3", label: "o3 — reasoning mạnh nhất" },
  ],
  groq: [
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant — cực nhanh" },
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
    { value: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B" },
    { value: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B" },
    { value: "qwen/qwen3-32b", label: "Qwen3 32B" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
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

  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [keyPending, startKey] = useTransition();

  const [providerPending, startProvider] = useTransition();
  const [providerErr, setProviderErr] = useState<string | null>(null);
  const [providerSaved, setProviderSaved] = useState(false);

  function handleProviderChange(p: Provider) {
    setProvider(p);
    setProviderSaved(false);
    // Reset model to first option for new provider
    setModel(MODELS_BY_PROVIDER[p][0].value);
  }

  function submitProviderAndModel() {
    setProviderErr(null);
    setProviderSaved(false);
    startProvider(async () => {
      const [pRes, mRes] = await Promise.all([
        updateAgentProviderAction({ communityId, communitySlug, provider }),
        updateAgentModelAction({ communityId, communitySlug, model }),
      ]);
      if (!pRes.ok) { setProviderErr(pRes.reason); return; }
      if (!mRes.ok) { setProviderErr(mRes.reason); return; }
      setProviderSaved(true);
      router.refresh();
    });
  }

  function submitKey() {
    setKeyErr(null);
    setKeySaved(false);
    startKey(async () => {
      const res = await updateAgentApiKeyAction({ communityId, communitySlug, apiKey });
      if (res.ok) {
        setKeySaved(true);
        setApiKey("");
        router.refresh();
      } else {
        setKeyErr(res.reason);
      }
    });
  }

  function submitPrompt() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateAgentSystemPromptAction({ communityId, communitySlug, prompt });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  const availableModels = MODELS_BY_PROVIDER[provider];

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
            disabled={providerPending}
            style={{ ...selectStyle, flex: "0 0 200px" }}
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={providerPending}
            style={{ ...selectStyle, flex: 1 }}
          >
            {availableModels.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={submitProviderAndModel}
            disabled={providerPending}
            style={{
              ...btnPrimary,
              opacity: providerPending ? 0.6 : 1,
              cursor: providerPending ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {providerPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
        <ErrorBox msg={providerErr} />
        <SuccessBox shown={providerSaved} />
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={API_KEY_PLACEHOLDER[provider]}
            disabled={keyPending}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={submitKey}
            disabled={keyPending || !apiKey.trim()}
            style={{
              ...btnPrimary,
              opacity: keyPending || !apiKey.trim() ? 0.6 : 1,
              cursor: keyPending || !apiKey.trim() ? "not-allowed" : "pointer",
            }}
          >
            {keyPending ? "Đang lưu…" : "Lưu key"}
          </button>
        </div>
        <ErrorBox msg={keyErr} />
        <SuccessBox shown={keySaved} />
      </div>

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
        disabled={pending}
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
          disabled={pending}
          style={{
            ...btnPrimary,
            marginLeft: "auto",
            opacity: pending ? 0.6 : 1,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "Đang lưu…" : "Lưu prompt"}
        </button>
      </div>
      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
