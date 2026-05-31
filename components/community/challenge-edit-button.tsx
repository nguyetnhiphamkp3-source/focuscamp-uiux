"use client";

import { Pencil } from "lucide-react";

function SettingsEditButton({ eventName, label }: { eventName: string; label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(eventName))}
      title={label}
      style={{
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "transparent",
        border: "1px solid var(--border-subtle)",
        borderRadius: 6,
        padding: "4px 10px",
        cursor: "pointer",
        color: "var(--text-muted)",
        fontSize: "var(--text-xs)",
        fontFamily: "inherit",
        transition: "color 150ms, border-color 150ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--header-primary)";
        e.currentTarget.style.borderColor = "var(--header-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
    >
      <Pencil size={12} />
      <span className="challenge-edit-label">Chỉnh sửa</span>
    </button>
  );
}

export function ChallengeEditButton() {
  return <SettingsEditButton eventName="open-challenge-settings" label="Chỉnh sửa challenge" />;
}

export function CourseEditButton() {
  return <SettingsEditButton eventName="open-course-settings" label="Chỉnh sửa khoá học" />;
}
