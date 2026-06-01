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
  {
    key: "new_member",
    label: "🎉 Member mới join",
    vars: "{{name}}",
    defaults: { title: "🎉 {{name}} vừa join cộng đồng", description: "Welcome {{name}}!" },
  },
  {
    key: "checkin_submitted",
    label: "✓ Check-in submitted",
    vars: "{{name}}, {{challenge}}, {{day}}",
    defaults: { title: "✅ {{name}} vừa check-in", description: "{{challenge}} · Ngày {{day}}" },
  },
  {
    key: "post_cot",
    label: "⭐ CỐT post mới",
    vars: "{{postTitle}}, {{content}}, {{community}}",
    defaults: { title: "⭐ Bài CỐT mới: {{postTitle}}", description: "{{content}}" },
  },
  {
    key: "purchase_completed",
    label: "💰 Đơn hàng",
    vars: "{{product}}, {{buyer}}, {{amount}}",
    defaults: { title: "💰 Đơn hàng mới: {{product}}", description: "{{buyer}} · {{amount}}đ" },
  },
  {
    key: "challenge_completed",
    label: "🏆 Hoàn thành challenge",
    vars: "{{name}}, {{challenge}}",
    defaults: { title: "🏆 {{name}} hoàn thành challenge!", description: "{{challenge}}" },
  },
] as const;

type EventKey = (typeof EVENT_TYPES)[number]["key"];
type Templates = Record<string, { title: string; description: string }>;

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
    templates?: Record<string, { title?: string; description?: string }>;
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
  // Template state: merge saved templates with defaults (empty strings = use system default)
  const [templates, setTemplates] = useState<Templates>(() => {
    const result: Templates = {};
    for (const e of EVENT_TYPES) {
      const saved = initial.templates?.[e.key];
      result[e.key] = {
        title: saved?.title ?? "",
        description: saved?.description ?? "",
      };
    }
    return result;
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<EventKey | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleSet(s: Set<string>, key: string): Set<string> {
    const next = new Set(s);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  }

  function setTmpl(eventKey: string, field: "title" | "description", val: string) {
    setTemplates((prev) => ({ ...prev, [eventKey]: { ...prev[eventKey], [field]: val } }));
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
      // Only pass non-empty templates
      const tmplPayload: Record<string, { title?: string; description?: string }> = {};
      for (const [k, v] of Object.entries(templates)) {
        if (v.title.trim() || v.description.trim()) {
          tmplPayload[k] = {
            ...(v.title.trim() ? { title: v.title.trim() } : {}),
            ...(v.description.trim() ? { description: v.description.trim() } : {}),
          };
        }
      }
      const res = await updateChannelConfigAction({
        communityId,
        communitySlug,
        discord: discordUrl.trim()
          ? { webhookUrl: discordUrl.trim(), eventTypes: Array.from(discordEvents) }
          : null,
        telegram:
          tgToken.trim() && tgChatId.trim()
            ? { botToken: tgToken.trim(), chatId: tgChatId.trim(), eventTypes: Array.from(tgEvents) }
            : null,
        templates: Object.keys(tmplPayload).length ? tmplPayload : undefined,
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

      {/* TEMPLATES */}
      <div
        style={{
          padding: 14,
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setShowTemplates((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            width: "100%",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--header-primary)" }}>
            ✏️ Tùy chỉnh nội dung thông báo
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 4 }}>
            (tuỳ chọn — để trống = dùng mặc định)
          </span>
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 12 }}>
            {showTemplates ? "▲" : "▼"}
          </span>
        </button>

        {showTemplates && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {EVENT_TYPES.map((e) => {
              const isOpen = expandedEvent === e.key;
              const tmpl = templates[e.key];
              const hasCustom = tmpl?.title.trim() || tmpl?.description.trim();
              return (
                <div
                  key={e.key}
                  style={{
                    border: `1px solid ${hasCustom ? "var(--brand-green)" : "var(--border-subtle)"}`,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedEvent(isOpen ? null : e.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "8px 12px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--header-primary)" }}>
                      {e.label}
                    </span>
                    {hasCustom && (
                      <span style={{ fontSize: 10, color: "var(--brand-green)", marginLeft: 4 }}>
                        ● tuỳ chỉnh
                      </span>
                    )}
                    <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 11 }}>
                      {isOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", background: "var(--bg-secondary)", borderRadius: 6, padding: "6px 10px" }}>
                        <strong>Biến:</strong> {e.vars}
                        <br />
                        <strong>Mặc định:</strong> {e.defaults.title}
                      </div>
                      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Tiêu đề</span>
                        <input
                          type="text"
                          value={tmpl?.title ?? ""}
                          onChange={(ev) => setTmpl(e.key, "title", ev.target.value)}
                          disabled={pending}
                          placeholder={e.defaults.title}
                          style={inputStyle}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Nội dung</span>
                        <input
                          type="text"
                          value={tmpl?.description ?? ""}
                          onChange={(ev) => setTmpl(e.key, "description", ev.target.value)}
                          disabled={pending}
                          placeholder={e.defaults.description}
                          style={inputStyle}
                        />
                      </label>
                      {(tmpl?.title.trim() || tmpl?.description.trim()) && (
                        <button
                          type="button"
                          onClick={() => { setTmpl(e.key, "title", ""); setTmpl(e.key, "description", ""); }}
                          style={{ fontSize: "var(--text-xs)", color: "var(--danger)", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-start", padding: 0 }}
                        >
                          ✕ Xoá tùy chỉnh (về mặc định)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
