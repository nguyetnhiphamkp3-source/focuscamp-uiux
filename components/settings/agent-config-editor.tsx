"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAgentSystemPromptAction } from "@/app/actions/agent";
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
  initial: { prompt: string };
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initial.prompt);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit() {
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

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="AI Agent"
        subtitle="System prompt cho Agent của cộng đồng. Để trống = dùng prompt mặc định."
      />
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
          onClick={submit}
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
