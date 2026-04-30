"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  generateTelegramPairCodeAction,
  unlinkTelegramAction,
} from "@/app/actions/telegram-link";

export function TelegramLinkPanel({
  initial,
}: {
  initial: { telegramUsername: string | null; isLinked: boolean };
}) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setErr(null);
    setCopied(false);
    start(async () => {
      const res = await generateTelegramPairCodeAction();
      if (res.ok && res.data) {
        setCode(res.data.code);
        setBotUsername(res.data.botUsername);
      } else if (!res.ok) {
        setErr(res.reason);
      }
    });
  }

  function unlink() {
    if (!confirm("Huỷ liên kết Telegram? Bot sẽ không nhớ ngữ cảnh của bạn nữa.")) return;
    start(async () => {
      const res = await unlinkTelegramAction();
      if (res.ok) {
        setCode(null);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  function copyStartCmd() {
    const cmd = `/start ${code}`;
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <h3
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--header-primary)",
          marginBottom: 6,
        }}
      >
        ✈️ Telegram
      </h3>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        Liên kết account Telegram để chat với AI agent trực tiếp trên Telegram.
        Lịch sử chat đồng bộ giữa web và Telegram — bot luôn nhớ ngữ cảnh dù
        bạn chat ở đâu.
      </p>

      {initial.isLinked ? (
        <div
          style={{
            padding: 12,
            background: "rgba(27,158,117,0.08)",
            border: "1px solid var(--brand-green)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 22 }}>✓</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: "var(--brand-green)" }}>
              Đã liên kết
            </div>
            {initial.telegramUsername && (
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                @{initial.telegramUsername}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={unlink}
            disabled={pending}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--danger)",
              background: "transparent",
              color: "var(--danger)",
              fontSize: "var(--text-sm)",
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            Huỷ liên kết
          </button>
        </div>
      ) : code && botUsername ? (
        <div
          style={{
            padding: 14,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 12 }}>
            <strong>Bước 1.</strong> Mở bot:{" "}
            <a
              href={`https://t.me/${botUsername}?start=${code}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--brand-green)", fontWeight: 600 }}
            >
              t.me/{botUsername}
            </a>{" "}
            (click để mở Telegram)
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginBottom: 8 }}>
            <strong>Bước 2.</strong> Trong Telegram, gõ:
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: "var(--bg-chat)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: "var(--text-md)",
              marginBottom: 10,
            }}
          >
            <code style={{ flex: 1, color: "var(--brand-green)" }}>/start {code}</code>
            <button
              type="button"
              onClick={copyStartCmd}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-card)",
                cursor: "pointer",
                fontSize: "var(--text-sm)",
              }}
            >
              {copied ? "✓ Đã copy" : "Copy"}
            </button>
          </div>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
            }}
          >
            Code có hiệu lực 15 phút.
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "var(--brand-green)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "var(--text-sm)",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Đang tạo…" : "Liên kết Telegram"}
        </button>
      )}
      {err && (
        <div style={{ marginTop: 8, color: "var(--danger)", fontSize: "var(--text-xs)" }}>
          {err}
        </div>
      )}
    </section>
  );
}
