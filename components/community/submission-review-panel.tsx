"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  reviewSubmissionAction,
  flagSubmissionAction,
  approveAllPendingAction,
} from "@/app/actions/challenge-review";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";

export type SubmissionRow = {
  id: string;
  content: string;
  linkUrl: string | null;
  imageUrl: string | null;
  status: string; // PENDING | APPROVED | REJECTED
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  dayNumber: number | null;
  user: { id: string; name: string | null; image: string | null };
  task: { dayNumber: number; title: string; label: string | null } | null;
  reviewedBy: { id: string; name: string | null } | null;
};

export function SubmissionReviewPanel({
  challengeId,
  communitySlug,
  challengeSlug,
  submissions,
  total,
  pendingCount,
  activeStatus,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  submissions: SubmissionRow[];
  total: number;
  pendingCount: number;
  activeStatus: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function review(
    checkinId: string,
    action: "APPROVE" | "REJECT",
    note?: string
  ) {
    setErr(null);
    start(async () => {
      const res = await reviewSubmissionAction({
        checkinId,
        action,
        note,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function flag(checkinId: string) {
    setErr(null);
    start(async () => {
      const res = await flagSubmissionAction({
        checkinId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function approveAll() {
    if (!confirm(`Duyệt tất cả ${pendingCount} submission đang chờ?`)) return;
    setErr(null);
    start(async () => {
      const res = await approveAllPendingAction({
        challengeId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <h3
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            color: "var(--header-primary)",
            margin: 0,
          }}
        >
          Duyệt submission
        </h3>
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          {total} tổng · {pendingCount} chờ duyệt
        </span>
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={approveAll}
            disabled={pending}
            style={{
              marginLeft: "auto",
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--brand-green)",
              background: "transparent",
              color: "var(--brand-green)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            ✓ Duyệt hết {pendingCount}
          </button>
        )}
      </div>

      {/* Status filter tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: 12,
        }}
      >
        {(
          [
            { key: "ALL", label: "Tất cả" },
            { key: "PENDING", label: `Chờ (${pendingCount})` },
            { key: "APPROVED", label: "Đã duyệt" },
            { key: "REJECTED", label: "Từ chối" },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={`?review=${t.key.toLowerCase()}`}
            scroll={false}
            style={{
              padding: "8px 14px",
              fontSize: "var(--text-sm)",
              color:
                activeStatus === t.key
                  ? "var(--header-primary)"
                  : "var(--text-muted)",
              borderBottom:
                activeStatus === t.key
                  ? "2px solid var(--brand-green)"
                  : "2px solid transparent",
              textDecoration: "none",
              fontWeight: activeStatus === t.key ? 600 : 400,
              marginBottom: -1,
            }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {submissions.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          {activeStatus === "PENDING"
            ? "🎉 Không có submission nào chờ duyệt."
            : "Chưa có submission trong nhóm này."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {submissions.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              communitySlug={communitySlug}
              pending={pending}
              onReview={review}
              onFlag={flag}
            />
          ))}
        </div>
      )}

      {err && (
        <div
          style={{
            marginTop: 10,
            padding: "6px 10px",
            fontSize: "var(--text-sm)",
            color: "var(--danger)",
            background: "rgba(218,55,60,0.08)",
            borderRadius: 6,
          }}
        >
          {err}
        </div>
      )}
    </section>
  );
}

function SubmissionCard({
  submission,
  communitySlug,
  pending,
  onReview,
  onFlag,
}: {
  submission: SubmissionRow;
  communitySlug: string;
  pending: boolean;
  onReview: (id: string, action: "APPROVE" | "REJECT", note?: string) => void;
  onFlag: (id: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const authorName = submission.user.name || "Ẩn danh";

  function handleReject() {
    if (!note.trim()) return;
    onReview(submission.id, "REJECT", note.trim());
    setNote("");
    setRejecting(false);
  }

  const statusBadge = (() => {
    switch (submission.status) {
      case "APPROVED":
        return (
          <span style={{ ...badgeStyle, color: "var(--success)", background: "rgba(36,128,70,0.12)" }}>
            ✓ Đã duyệt
          </span>
        );
      case "REJECTED":
        return (
          <span style={{ ...badgeStyle, color: "var(--danger)", background: "rgba(218,55,60,0.1)" }}>
            ✕ Từ chối
          </span>
        );
      case "PENDING":
      default:
        return (
          <span style={{ ...badgeStyle, color: "var(--warning)", background: "rgba(240,178,50,0.14)" }}>
            ⏳ Chờ duyệt
          </span>
        );
    }
  })();

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: 10,
        background: "var(--bg-card)",
        padding: 12,
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Link
          href={`/c/${communitySlug}/profile/${submission.user.id}`}
          style={{ flexShrink: 0 }}
        >
          {submission.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={submission.user.image}
              alt=""
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: avatarColorFor(submission.user.id),
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              {initials(authorName)}
            </div>
          )}
        </Link>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: "var(--text-sm)",
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/c/${communitySlug}/profile/${submission.user.id}`}
              style={{
                color: "var(--header-primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {authorName}
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
              {fmtRelativeTime(submission.createdAt)}
            </span>
            {submission.task && (
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  padding: "2px 8px",
                  background: "var(--bg-chat)",
                  borderRadius: 10,
                }}
              >
                📋 Day {submission.task.dayNumber}: {submission.task.label || submission.task.title}
              </span>
            )}
            {statusBadge}
          </div>

          <div
            style={{
              fontSize: "var(--text-base)",
              color: "var(--text-normal)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              marginBottom: 6,
            }}
          >
            {submission.content}
          </div>

          {submission.linkUrl && (
            <div style={{ fontSize: "var(--text-xs)", marginBottom: 4 }}>
              🔗{" "}
              <a
                href={submission.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--info)" }}
              >
                {submission.linkUrl}
              </a>
            </div>
          )}
          {submission.imageUrl && (
            <div style={{ marginTop: 6, marginBottom: 4 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={submission.imageUrl}
                alt="evidence"
                style={{
                  maxWidth: "100%",
                  maxHeight: 280,
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                }}
              />
            </div>
          )}

          {submission.reviewNote && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 10px",
                fontSize: "var(--text-xs)",
                background:
                  submission.status === "REJECTED"
                    ? "rgba(218,55,60,0.06)"
                    : "rgba(36,128,70,0.06)",
                border: `1px solid ${
                  submission.status === "REJECTED"
                    ? "rgba(218,55,60,0.2)"
                    : "rgba(36,128,70,0.2)"
                }`,
                borderRadius: 6,
                color: "var(--text-normal)",
              }}
            >
              <strong>
                {submission.reviewedBy?.name ?? "Admin"} ghi chú:
              </strong>{" "}
              {submission.reviewNote}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            {submission.status === "PENDING" && (
              <>
                <button
                  type="button"
                  onClick={() => onReview(submission.id, "APPROVE")}
                  disabled={pending}
                  style={actionBtnStyle("var(--success)", true)}
                >
                  ✓ Duyệt
                </button>
                <button
                  type="button"
                  onClick={() => setRejecting((v) => !v)}
                  disabled={pending}
                  style={actionBtnStyle("var(--danger)", false)}
                >
                  {rejecting ? "Huỷ" : "✕ Từ chối"}
                </button>
              </>
            )}
            {submission.status !== "PENDING" && (
              <button
                type="button"
                onClick={() => onFlag(submission.id)}
                disabled={pending}
                style={actionBtnStyle("var(--interactive-normal)", false)}
                title="Đưa trở lại trạng thái chờ duyệt để xem lại"
              >
                ⟲ Đưa về chờ duyệt
              </button>
            )}
          </div>

          {rejecting && submission.status === "PENDING" && (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lý do từ chối / góp ý cho người làm…"
                rows={2}
                maxLength={2000}
                autoFocus
                disabled={pending}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-chat)",
                  color: "var(--text-normal)",
                  fontSize: "var(--text-sm)",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={pending || !note.trim()}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "none",
                    background: note.trim()
                      ? "var(--danger)"
                      : "var(--bg-modifier-hover)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "var(--text-xs)",
                    cursor: note.trim() ? "pointer" : "not-allowed",
                  }}
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 10,
};

function actionBtnStyle(
  color: string,
  filled: boolean
): React.CSSProperties {
  return {
    padding: "6px 14px",
    borderRadius: 6,
    border: filled ? "none" : `1px solid ${color}`,
    background: filled ? color : "transparent",
    color: filled ? "#fff" : color,
    fontSize: "var(--text-xs)",
    fontWeight: 600,
    cursor: "pointer",
  };
}
