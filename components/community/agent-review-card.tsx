import type { AIReviewData } from "@/lib/ai-review-data";
import { avatarColorFor, initials } from "@/lib/brand";
import { renderMarkdown } from "@/lib/markdown";

export function AgentReviewCard({
  data,
  status,
  compact = false,
}: {
  data: AIReviewData;
  status?: string;
  compact?: boolean;
}) {
  const reviewerName = data.reviewerName?.trim() || "AI Agent";
  const decision = normalizeDecision(data.decision, status);
  const theme = reviewTheme(decision);
  const reviewedAt = formatReviewTime(data.reviewedAt);
  const confidence =
    typeof data.confidence === "number"
      ? `${Math.round(data.confidence * 100)}%`
      : null;

  return (
    <div
      style={{
        marginTop: compact ? 6 : 10,
        padding: compact ? 10 : 12,
        borderRadius: 8,
        border: `1px solid ${theme.border}`,
        borderLeft: `3px solid ${theme.accent}`,
        background: theme.background,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AgentAvatar
          name={reviewerName}
          avatarUrl={data.reviewerAvatarUrl ?? null}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <strong
              style={{
                color: "var(--header-primary)",
                fontSize: "var(--text-sm)",
              }}
            >
              {reviewerName}
            </strong>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
              đã review bài nộp{reviewedAt ? ` · ${reviewedAt}` : ""}
            </span>
          </div>

          <div
            style={{
              color: theme.accent,
              fontSize: compact ? "var(--text-xs)" : "var(--text-sm)",
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            Kết quả: {theme.label}
            {confidence ? ` (${confidence})` : ""}
          </div>

          <div
            className="md-content agent-md"
            style={{
              color: "var(--text-normal)",
              fontSize: compact ? "var(--text-xs)" : "var(--text-sm)",
              lineHeight: 1.55,
            }}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(data.reasoning || "Chưa có lý do cụ thể."),
            }}
          />
        </div>
      </div>
    </div>
  );
}

function AgentAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt=""
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background: avatarColorFor(name),
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: "var(--text-xs)",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

function normalizeDecision(decision: string, status?: string) {
  if (decision === "APPROVE" || decision === "REJECT" || decision === "FLAG") {
    return decision;
  }
  if (status === "APPROVED") return "APPROVE";
  if (status === "REJECTED") return "REJECT";
  return "FLAG";
}

function reviewTheme(decision: "APPROVE" | "REJECT" | "FLAG") {
  if (decision === "APPROVE") {
    return {
      label: "Đã duyệt",
      accent: "var(--success)",
      border: "rgba(36,128,70,0.22)",
      background: "rgba(36,128,70,0.06)",
    };
  }
  if (decision === "REJECT") {
    return {
      label: "Chưa đạt",
      accent: "var(--danger)",
      border: "rgba(218,55,60,0.24)",
      background: "rgba(218,55,60,0.06)",
    };
  }
  return {
    label: "Cần admin xem lại",
    accent: "var(--warning)",
    border: "rgba(240,178,50,0.28)",
    background: "rgba(240,178,50,0.08)",
  };
}

function formatReviewTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
