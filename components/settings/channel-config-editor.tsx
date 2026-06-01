"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChannelConfigAction } from "@/app/actions/community-settings";
import { btnPrimary, ErrorBox, SuccessBox, SectionHeader } from "./editor-shared";
import { EVENT_TYPES, type ChallengeOption } from "./channel-shared";
import { DiscordChannelCard, type DiscordChannelState } from "./discord-channel-card";
import { TelegramChannelCard, type TelegramChannelState } from "./telegram-channel-card";
import { ChannelTemplatesEditor, type Templates } from "./channel-templates-editor";

function newKey(): string {
  return crypto.randomUUID();
}

const addBtn: React.CSSProperties = {
  marginTop: 10,
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px dashed var(--border-subtle)",
  background: "transparent",
  color: "var(--brand-green)",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  cursor: "pointer",
};

export function ChannelConfigEditor({
  communityId,
  communitySlug,
  challenges,
  initial,
}: {
  communityId: string;
  communitySlug: string;
  challenges: ChallengeOption[];
  initial: {
    discord: Array<{ webhookUrl: string; eventTypes: string[]; challengeIds: string[] }>;
    telegram: Array<{
      id: string;
      hasToken: boolean;
      chatId: string;
      topicId: string;
      eventTypes: string[];
      challengeIds: string[];
    }>;
    templates?: Record<string, { title?: string; description?: string }>;
  };
}) {
  const router = useRouter();

  const [discord, setDiscord] = useState<DiscordChannelState[]>(() =>
    initial.discord.map((d) => ({
      _key: newKey(),
      webhookUrl: d.webhookUrl,
      eventTypes: new Set(d.eventTypes),
      challengeIds: new Set(d.challengeIds),
    })),
  );
  const [telegram, setTelegram] = useState<TelegramChannelState[]>(() =>
    initial.telegram.map((t) => ({
      _key: newKey(),
      id: t.id,
      hasToken: t.hasToken,
      botToken: "",
      chatId: t.chatId,
      topicId: t.topicId,
      eventTypes: new Set(t.eventTypes),
      challengeIds: new Set(t.challengeIds),
    })),
  );

  const [templates, setTemplates] = useState<Templates>(() => {
    const result: Templates = {};
    for (const e of EVENT_TYPES) {
      const saved = initial.templates?.[e.key];
      result[e.key] = { title: saved?.title ?? "", description: saved?.description ?? "" };
    }
    return result;
  });

  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setTmpl(eventKey: string, field: "title" | "description", val: string) {
    setTemplates((prev) => ({ ...prev, [eventKey]: { ...prev[eventKey], [field]: val } }));
  }

  function updateDiscord(i: number, next: DiscordChannelState) {
    setDiscord((prev) => prev.map((c, idx) => (idx === i ? next : c)));
  }
  function updateTelegram(i: number, next: TelegramChannelState) {
    setTelegram((prev) => prev.map((c, idx) => (idx === i ? next : c)));
  }

  function submit() {
    setErr(null);
    setSaved(false);
    start(async () => {
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
        discord: discord
          .filter((d) => d.webhookUrl.trim())
          .map((d) => ({
            webhookUrl: d.webhookUrl.trim(),
            eventTypes: Array.from(d.eventTypes),
            challengeIds: Array.from(d.challengeIds),
          })),
        telegram: telegram
          .filter((t) => t.chatId.trim())
          .map((t) => ({
            id: t.id,
            botToken: t.botToken.trim() || undefined,
            chatId: t.chatId.trim(),
            topicId: t.topicId.trim() || undefined,
            eventTypes: Array.from(t.eventTypes),
            challengeIds: Array.from(t.challengeIds),
          })),
        templates: Object.keys(tmplPayload).length ? tmplPayload : undefined,
      });
      if (res.ok) {
        setSaved(true);
        // Tokens are encrypted server-side; clear inputs + mark as saved.
        setTelegram((prev) =>
          prev
            .filter((t) => t.chatId.trim())
            .map((t) => ({ ...t, botToken: "", hasToken: t.hasToken || !!t.botToken.trim() })),
        );
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <section className="ui-card ui-card-lg" style={{ marginBottom: "var(--space-4)" }}>
      <SectionHeader
        title="Discord + Telegram channels"
        subtitle="Đẩy event quan trọng (member mới, đơn hàng, CỐT post...) sang nhiều Discord webhook + Telegram bot. Mỗi kênh có thể lọc theo challenge cụ thể. Owner cần setup riêng webhook/bot ở phía Discord/Telegram."
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
        <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>🟣 Discord webhooks</div>
        {discord.map((c, i) => (
          <DiscordChannelCard
            key={c._key}
            index={i}
            channel={c}
            challenges={challenges}
            disabled={pending}
            onChange={(next) => updateDiscord(i, next)}
            onRemove={() => setDiscord((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            setDiscord((prev) => [
              ...prev,
              { _key: newKey(), webhookUrl: "", eventTypes: new Set(), challengeIds: new Set() },
            ])
          }
          style={addBtn}
        >
          + Thêm Discord webhook
        </button>
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
        <div style={{ fontWeight: 700, color: "var(--header-primary)" }}>✈️ Telegram bots</div>
        {telegram.map((c, i) => (
          <TelegramChannelCard
            key={c._key}
            index={i}
            channel={c}
            challenges={challenges}
            disabled={pending}
            onChange={(next) => updateTelegram(i, next)}
            onRemove={() => setTelegram((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            setTelegram((prev) => [
              ...prev,
              {
                _key: newKey(),
                hasToken: false,
                botToken: "",
                chatId: "",
                topicId: "",
                eventTypes: new Set(),
                challengeIds: new Set(),
              },
            ])
          }
          style={addBtn}
        >
          + Thêm Telegram bot
        </button>
      </div>

      <ChannelTemplatesEditor templates={templates} disabled={pending} onSet={setTmpl} />

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
