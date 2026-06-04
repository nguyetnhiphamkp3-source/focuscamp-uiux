"use client";

import { useEffect, useState } from "react";
import { inputStyle } from "./editor-shared";
import {
  EventChips,
  ChallengePicker,
  CHALLENGE_SCOPED_EVENTS,
  type ChallengeOption,
} from "./channel-shared";

export interface TelegramChannelState {
  _key: string;
  /** Stable id of an existing channel (undefined for newly added ones). */
  id?: string;
  /** Whether a bot token is already saved server-side for this channel. */
  hasToken: boolean;
  /** Newly entered token — empty means keep the saved one. */
  botToken: string;
  /** Optional display name so owners can tell bots/groups apart. */
  label: string;
  chatId: string;
  topicId: string;
  eventTypes: Set<string>;
  challengeIds: Set<string>;
  /** Display name of who added this bot (null = not saved yet / legacy). */
  addedByName: string | null;
}

const chevronBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
  color: "var(--text-muted)",
  fontSize: 12,
  lineHeight: 1,
};

const configuredBadge: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--brand-green)",
  background: "rgba(27,158,117,0.12)",
  border: "1px solid var(--brand-green)",
  borderRadius: 6,
  padding: "1px 6px",
};

const removeBtn: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "var(--text-xs)",
  color: "var(--danger)",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};

const summaryRow: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "2px 0 0 18px",
  fontSize: "var(--text-sm)",
  color: "var(--text-muted)",
};

export function TelegramChannelCard({
  index,
  channel,
  challenges,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  channel: TelegramChannelState;
  challenges: ChallengeOption[];
  disabled?: boolean;
  onChange: (next: TelegramChannelState) => void;
  onRemove: () => void;
}) {
  // Already-configured bots start collapsed so the list is scannable; new ones
  // stay expanded so they can be filled in.
  const [collapsed, setCollapsed] = useState(channel.hasToken);
  // Re-collapse once a freshly-added bot becomes configured (hasToken false→true
  // on its first save). Existing bots keep any manual expand/collapse because
  // their hasToken never changes, so this effect won't re-fire for them.
  useEffect(() => {
    setCollapsed(channel.hasToken);
  }, [channel.hasToken]);
  const showChallengeFilter = CHALLENGE_SCOPED_EVENTS.some((e) => channel.eventTypes.has(e));
  const eventCount = channel.eventTypes.size;

  return (
    <div
      style={{
        padding: 12,
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        marginTop: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: collapsed ? 0 : 6 }}>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          style={chevronBtn}
          aria-label={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)" }}>
          {channel.label.trim() || `Bot #${index + 1}`}
        </span>
        {channel.hasToken && <span style={configuredBadge}>✓ đã cấu hình</span>}
        {channel.addedByName && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            👤 {channel.addedByName}
          </span>
        )}
        <button type="button" onClick={onRemove} disabled={disabled} style={removeBtn}>
          ✕ Xoá
        </button>
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          style={summaryRow}
          aria-label="Mở rộng để sửa"
        >
          💬 {channel.chatId || "(chưa có Chat ID)"}
          {channel.topicId ? ` · topic ${channel.topicId}` : ""}
          {` · ${eventCount} sự kiện`}
        </button>
      ) : (
        <>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Tên bot (tuỳ chọn — để dễ phân biệt nhóm)
            </span>
            <input
              type="text"
              value={channel.label}
              onChange={(e) => onChange({ ...channel, label: e.target.value })}
              disabled={disabled}
              placeholder={`VD: Group ThaiSon (mặc định: Bot #${index + 1})`}
              style={inputStyle}
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Bot token (BotFather → /newbot)
              </span>
              <input
                type="password"
                value={channel.botToken}
                onChange={(e) => onChange({ ...channel, botToken: e.target.value })}
                disabled={disabled}
                placeholder={channel.hasToken ? "•••••• (đã lưu — để trống = giữ nguyên)" : "123456:ABC-DEF..."}
                style={inputStyle}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                Chat ID (channel hoặc group)
              </span>
              <input
                type="text"
                value={channel.chatId}
                onChange={(e) => onChange({ ...channel, chatId: e.target.value })}
                disabled={disabled}
                placeholder="-1001234567890"
                style={inputStyle}
              />
            </label>
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Topic ID (tuỳ chọn — chỉ dùng cho group có bật Topics)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={channel.topicId}
              onChange={(e) => onChange({ ...channel, topicId: e.target.value })}
              disabled={disabled}
              placeholder="VD: 42 (để trống = gửi vào General)"
              style={inputStyle}
            />
          </label>
          <EventChips
            selected={channel.eventTypes}
            disabled={disabled}
            onToggle={(key) => {
              const next = new Set(channel.eventTypes);
              if (next.has(key)) next.delete(key);
              else next.add(key);
              onChange({ ...channel, eventTypes: next });
            }}
          />
          <ChallengePicker
            challenges={challenges}
            selected={channel.challengeIds}
            disabled={disabled}
            visible={showChallengeFilter}
            onToggle={(id) => {
              const next = new Set(channel.challengeIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              onChange({ ...channel, challengeIds: next });
            }}
          />
        </>
      )}
    </div>
  );
}
