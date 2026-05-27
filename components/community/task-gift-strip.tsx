import type { CSSProperties } from "react";

/**
 * Reward strip injected between tasks in the challenge task list — sits right
 * below the task that owns the gift. File downloads route through the protected
 * /api/challenges/tasks/<taskId>/gift endpoint (gated on APPROVED check-in);
 * external links open directly.
 */
export function TaskGiftStrip({
  taskId,
  label,
  fileUrl,
  linkUrl,
  adminPreview = false,
}: {
  taskId: string;
  label: string;
  fileUrl?: string | null;
  linkUrl?: string | null;
  adminPreview?: boolean;
}) {
  return (
    <div
      style={{
        margin: "calc(-1 * var(--space-2)) 0 var(--space-3) 28px",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--brand-green)",
        background: "rgba(27,158,117,0.08)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1 }}>🎁</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--brand-green)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Quà hoàn thành
        </div>
        <div
          style={{
            fontSize: "var(--text-base)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--header-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </div>
        {adminPreview && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            (preview — member thấy sau khi hoàn thành)
          </div>
        )}
      </div>
      {fileUrl && (
        <a href={`/api/challenges/tasks/${taskId}/gift`} style={giftBtnStyle}>
          ⬇ Tải về
        </a>
      )}
      {linkUrl && (
        <a href={linkUrl} target="_blank" rel="noreferrer" style={giftBtnStyle}>
          ↗ Mở link
        </a>
      )}
    </div>
  );
}

const giftBtnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: "var(--r-md)",
  background: "var(--brand-green)",
  color: "#fff",
  fontSize: "var(--text-sm)",
  fontWeight: "var(--fw-semibold)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
