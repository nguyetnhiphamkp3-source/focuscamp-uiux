"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChannelConfigAction } from "@/app/actions/community-settings";
import {
  inputStyle,
  btnPrimary,
  ErrorBox,
  SuccessBox,
  SectionHeader,
} from "./editor-shared";

const EVENT_TYPES = [
  { key: "new_member", label: "🎉 Member mới join" },
  { key: "checkin_submitted", label: "✓ Check-in submitted" },
  { key: "post_cot", label: "⭐ CỐT post mới" },
  { key: "purchase_completed", label: "💰 Đơn hàng" },
  { key: "challenge_completed", label: "🏆 Hoàn thành challenge" },
] as const;

export function ChannelConfigEditor({
  communityId,
  communitySlug,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  initial: {
    discord: { webhookUrl: string; eventTypes: string[] } | null;
    telegram: { chatId: string; eventTypes: string[] } | null;
  };
}) {
  const router = useRouter();
  const [discordUrl, setDiscordUrl] = useState(initial.discord?.webhookUrl ?? "");
  const [discordEvents, setDiscordEvents] = useState<Set<string>>(
    new Set(initial.discord?.eventTypes ?? []),
  );
  const [tgToken, setTgToken] = useState(""); // never preload
  const [tgChatId, setTgChatId] = useState(initial.telegram?.chatId ?? "");
  const [tgEvents, setTgEvents] = useState<Set<string>>(
    new Set(initial.telegram?.eventTypes ?? []),
  );
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleSet(s: Set<string>, key: string): Set<string> {
    const next = new Set(s);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      const res = await updateChannelConfigAction({
        communityId,
        communitySlug,
        discord: discordUrl.trim()
          ? {
              webhookUrl: discordUrl.trim(),
              eventTypes: Array.from(discordEvents),
            }
          : null,
        telegram:
          tgToken.trim() && tgChatId.trim()
            ? {
                botToken: tgToken.trim(),
                chatId: tgChatId.trim(),
                eventTypes: Array.from(tgEvents),
              }
            : null,
      });
      if (res.ok) {
        setSaved(true);
        setTgToken(""); // clear after save (encrypted)
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
        title="Discord + Telegram channels"
        subtitle="Đẩy event quan trọng (member mới, đơn hàng, CỐT post...) sang Discord webhook + Telegram bot. Owner cần setup riêng webhook/bot ở phía Discord/Telegram."
      />

      {/* DISCORD */}
      <div
        style={{
          padding: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 8 }}>
          🟣 Discord webhook
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Webhook URL (Server Settings → Integrations → New Webhook)
          </span>
          <input
            type="url"
            value={discordUrl}
            onChange={(e) => setDiscordUrl(e.target.value)}
            disabled={pending}
            placeholder="https://discord.com/api/webhooks/..."
            style={inputStyle}
          />
        </label>
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EVENT_TYPES.map((e) => {
            const on = discordEvents.has(e.key);
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => setDiscordEvents(toggleSet(discordEvents, e.key))}
                disabled={pending}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${on ? "var(--brand-green)" : "var(--border-subtle)"}`,
                  background: on ? "rgba(27,158,117,0.08)" : "transparent",
                  color: on ? "var(--brand-green)" : "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                  cursor: "pointer",
                }}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TELEGRAM */}
      <div
        style={{
          padding: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--header-primary)", marginBottom: 8 }}>
          ✈️ Telegram bot
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Bot token (BotFather → /newbot)
            </span>
            <input
              type="password"
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
              disabled={pending}
              placeholder={initial.telegram ? "•••••• (đã lưu)" : "123456:ABC-DEF..."}
              style={inputStyle}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Chat ID (channel hoặc group)
            </span>
            <input
              type="text"
              value={tgChatId}
              onChange={(e) => setTgChatId(e.target.value)}
              disabled={pending}
              placeholder="-1001234567890"
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {EVENT_TYPES.map((e) => {
            const on = tgEvents.has(e.key);
            return (
              <button
                key={e.key}
                type="button"
                onClick={() => setTgEvents(toggleSet(tgEvents, e.key))}
                disabled={pending}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${on ? "var(--brand-green)" : "var(--border-subtle)"}`,
                  background: on ? "rgba(27,158,117,0.08)" : "transparent",
                  color: on ? "var(--brand-green)" : "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                  cursor: "pointer",
                }}
              >
                {e.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex" }}>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          style={{ ...btnPrimary, marginLeft: "auto", opacity: pending ? 0.6 : 1 }}
        >
          {pending ? "Đang lưu…" : "Lưu channels"}
        </button>
      </div>
      <ErrorBox msg={err} />
      <SuccessBox shown={saved} />
    </section>
  );
}
