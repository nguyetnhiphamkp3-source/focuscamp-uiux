"use client";

export function ChallengeEditButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-challenge-settings"))}
      title="Chỉnh sửa challenge"
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
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
      </svg>
      <span className="challenge-edit-label">Chỉnh sửa</span>
    </button>
  );
}
