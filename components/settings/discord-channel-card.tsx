"use client";

import { inputStyle } from "./editor-shared";
import {
  EventChips,
  ChallengePicker,
  CHALLENGE_SCOPED_EVENTS,
  type ChallengeOption,
} from "./channel-shared";

export interface DiscordChannelState {
  _key: string;
  webhookUrl: string;
  eventTypes: Set<string>;
  challengeIds: Set<string>;
  /** Display name of who added this webhook (null = not saved yet / legacy). */
  addedByName: string | null;
}

export function DiscordChannelCard({
  index,
  channel,
  challenges,
  disabled,
  onChange,
  onRemove,
}: {
  index: number;
  channel: DiscordChannelState;
  challenges: ChallengeOption[];
  disabled?: boolean;
  onChange: (next: DiscordChannelState) => void;
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
          Webhook #{index + 1}
        </span>
        {channel.addedByName && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 8 }}>
            👤 {channel.addedByName}
          </span>
        )}
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
      <input
        type="url"
        value={channel.webhookUrl}
        onChange={(e) => onChange({ ...channel, webhookUrl: e.target.value })}
        disabled={disabled}
        placeholder="https://discord.com/api/webhooks/..."
        style={inputStyle}
      />
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
