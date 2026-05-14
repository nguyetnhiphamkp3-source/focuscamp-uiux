"use client";

export function LockedLessonNotice() {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 10,
        background: "rgba(218,55,60,0.08)",
        border: "1px solid var(--border-subtle)",
        marginBottom: "var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
      }}
    >
      <span style={{ fontSize: 20 }}>🔒</span>
      <div>
        <div
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-heading)",
            marginBottom: 2,
          }}
        >
          Bài học chưa được mở khoá
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Hãy hoàn thành bài học trước để tiếp tục.
        </div>
      </div>
    </div>
  );
}
