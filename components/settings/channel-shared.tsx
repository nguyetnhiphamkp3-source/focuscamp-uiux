"use client";

/**
 * Shared building blocks for the multi-channel notification editor:
 * event-type definitions, the event-toggle chip row, and the optional
 * per-challenge filter picker. Used by both Discord and Telegram cards.
 */

export const EVENT_TYPES = [
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

export type EventKey = (typeof EVENT_TYPES)[number]["key"];

/** Events whose delivery honors a channel's per-challenge filter. */
export const CHALLENGE_SCOPED_EVENTS: EventKey[] = ["checkin_submitted", "challenge_completed"];

export interface ChallengeOption {
  id: string;
  title: string;
}

export function toggleSet(s: Set<string>, key: string): Set<string> {
  const next = new Set(s);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

const chipStyle = (on: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${on ? "var(--brand-green)" : "var(--border-subtle)"}`,
  background: on ? "rgba(27,158,117,0.08)" : "transparent",
  color: on ? "var(--brand-green)" : "var(--text-muted)",
  fontSize: "var(--text-xs)",
  cursor: "pointer",
});

export function EventChips({
  selected,
  onToggle,
  disabled,
}: {
  selected: Set<string>;
  onToggle: (key: string) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
      {EVENT_TYPES.map((e) => (
        <button
          key={e.key}
          type="button"
          onClick={() => onToggle(e.key)}
          disabled={disabled}
          style={chipStyle(selected.has(e.key))}
        >
          {e.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Per-challenge filter. Only relevant when the channel subscribes to a
 * challenge-scoped event. Empty selection = all challenges.
 */
export function ChallengePicker({
  challenges,
  selected,
  onToggle,
  disabled,
  visible,
}: {
  challenges: ChallengeOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  disabled?: boolean;
  visible: boolean;
}) {
  if (!visible || challenges.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: "1px dashed var(--border-subtle)",
      }}
    >
      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 6 }}>
        🎯 Chỉ bắn cho challenge (để trống = tất cả challenge)
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {challenges.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            disabled={disabled}
            style={chipStyle(selected.has(c.id))}
          >
            {c.title}
          </button>
        ))}
      </div>
    </div>
  );
}
