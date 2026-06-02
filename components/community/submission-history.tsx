import type { CheckinHistoryEntry } from "@/lib/checkin-history";
import { AgentReviewCard } from "@/components/community/agent-review-card";
import { SubmissionImageCarousel } from "@/components/community/submission-image-carousel";

/**
 * Collapsible proof trail of rejected attempts for a check-in.
 * Renders nothing when there's no history. Server component — the only
 * interactive bit (image carousel) is its own client boundary.
 */
export function SubmissionHistory({ entries }: { entries: CheckinHistoryEntry[] }) {
  if (entries.length === 0) return null;

  // Newest rejection first.
  const ordered = [...entries].sort((a, b) =>
    (b.rejectedAt || "").localeCompare(a.rejectedAt || "")
  );

  return (
    <details
      style={{
        marginTop: "var(--space-3)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 8,
        background: "var(--bg-secondary)",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "8px 12px",
          fontSize: "var(--text-xs)",
          fontWeight: 700,
          color: "var(--text-muted)",
          listStyle: "none",
        }}
      >
        📜 Lịch sử bị từ chối ({entries.length})
      </summary>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          padding: "0 12px 12px",
        }}
      >
        {ordered.map((e, i) => (
          <div
            key={`${e.rejectedAt}-${i}`}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(218,55,60,0.22)",
              background: "rgba(218,55,60,0.05)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  color: "var(--danger)",
                }}
              >
                ✕ Lần nộp #{e.attempt > 0 ? e.attempt : i + 1} — bị từ chối
              </span>
              {e.rejectedAt && (
                <span
                  style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
                >
                  {fmtTime(e.rejectedAt)}
                </span>
              )}
            </div>

            {e.reviewNote && (
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--danger)",
                  marginBottom: 6,
                  padding: "6px 10px",
                  background: "rgba(218,55,60,0.08)",
                  borderRadius: 6,
                }}
              >
                <strong>Lý do:</strong> {e.reviewNote}
              </div>
            )}

            {e.aiReviewData && (
              <AgentReviewCard data={e.aiReviewData} status="REJECTED" compact />
            )}

            {e.content && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-normal)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.5,
                }}
              >
                {e.content}
              </div>
            )}

            {e.linkUrl && (
              <a
                href={e.linkUrl}
                target="_blank"
                rel="noreferrer"
                className="ch-submission-link"
              >
                {e.linkUrl}
              </a>
            )}

            <SubmissionImageCarousel images={e.imageUrls} alt="bài nộp cũ" compact />
          </div>
        ))}
      </div>
    </details>
  );
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
