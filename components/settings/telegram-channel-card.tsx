"use client";

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
  chatId: string;
  topicId: string;
  eventTypes: Set<string>;
  challengeIds: Set<string>;
}

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
  const showChallengeFilter = CHALLENGE_SCOPED_EVENTS.some((e) => channel.eventTypes.has(e));
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
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)" }}>
          Bot #{index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          style={{
            marginLeft: "auto",
            fontSize: "var(--text-xs)",
            color: "var(--danger)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          ✕ Xoá
        </button>
      </div>
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
    </div>
  );
}
