"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateAgentSystemPromptAction,
  updateAgentApiKeyAction,
} from "@/app/actions/agent";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

export function AgentConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: { prompt: string; hasApiKey: boolean };
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initial.prompt);
  const [apiKey, setApiKey] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [keyErr, setKeyErr] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [keyPending, startKey] = useTransition();

  function submitPrompt() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateAgentSystemPromptAction({
        communityId,
        communitySlug,
        prompt,
      });
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function submitKey() {
    setKeyErr(null);
    setKeySaved(false);
    startKey(async () => {
      const res = await updateAgentApiKeyAction({
        communityId,
        communitySlug,
        apiKey,
      });
      if (res.ok) {
        setKeySaved(true);
        setApiKey("");
        router.refresh();
      } else {
        setKeyErr(res.reason);
      }
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="AI Agent"
        subtitle="Cấu hình API key và system prompt cho Agent của cộng đồng."
      />

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
          Anthropic API Key
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
            : "Chưa có API key. Thành viên sẽ không thể chat với Agent cho đến khi bạn nhập key."}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
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
