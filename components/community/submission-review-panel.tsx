"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  reviewSubmissionAction,
  flagSubmissionAction,
  approveAllPendingAction,
} from "@/app/actions/challenge-review";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import type { AIReviewData } from "@/lib/ai-review-data";
import { AgentReviewCard } from "@/components/community/agent-review-card";
import { SubmissionImageCarousel } from "@/components/community/submission-image-carousel";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { LinkifiedText } from "@/components/shared/linkified-text";

export type SubmissionRow = {
  id: string;
  content: string;
  linkUrl: string | null;
  imageUrls: string[];
  status: string; // PENDING | APPROVED | REJECTED
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  dayNumber: number | null;
  user: { id: string; name: string | null; image: string | null };
  task: { dayNumber: number; title: string; label: string | null } | null;
  reviewedBy: { id: string; name: string | null } | null;
  aiReviewData?: AIReviewData | null;
};

export function SubmissionReviewPanel({
  challengeId,
  communitySlug,
  challengeSlug,
  submissions: initialSubmissions,
  total,
  pendingCount: initialPendingCount,
  aiFlaggedCount: initialAiFlaggedCount,
  activeStatus,
  page,
  search,
  pageSize,
}: {
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
  submissions: SubmissionRow[];
  total: number;
  pendingCount: number;
  aiFlaggedCount: number;
  activeStatus: "ALL" | "AI_FLAGGED" | "PENDING" | "APPROVED" | "REJECTED";
  page: number;
  search: string;
  pageSize: number;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showApproveAllConfirm, setShowApproveAllConfirm] = useState(false);
  const [searchInput, setSearchInput] = useState(search);

  // Local view state — seeded from server props, mutated optimistically on a
  // review click, then reconciled to the action's authoritative returned payload.
  // This is what makes a click render-free: the panel never refetches the
  // force-dynamic detail page; server-side revalidation runs in after() on the action.
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);
  const [aiFlaggedCount, setAiFlaggedCount] = useState(initialAiFlaggedCount);

  // Re-sync when the server sends a fresh page (tab / pagination / search nav).
  useEffect(() => {
    setSubmissions(initialSubmissions);
    setPendingCount(initialPendingCount);
    setAiFlaggedCount(initialAiFlaggedCount);
  }, [initialSubmissions, initialPendingCount, initialAiFlaggedCount]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Does a row with this status still belong in the current tab?
  const rowMatchesView = useCallback(
    (status: string): boolean => {
      switch (activeStatus) {
        case "PENDING":
        case "AI_FLAGGED":
          return status === "PENDING";
        case "APPROVED":
          return status === "APPROVED";
        case "REJECTED":
          return status === "REJECTED";
        case "ALL":
        default:
          return true;
      }
    },
    [activeStatus],
  );

  // Apply a status change to local rows: drop the row if it no longer matches the
  // active tab, otherwise patch it in place. Authoritative counts (when provided)
  // overwrite the optimistic ones.
  const applyReview = useCallback(
    (
      checkinId: string,
      newStatus: string,
      patch: { reviewNote?: string | null; reviewedAt?: Date | null; reviewedByName?: string | null },
      counts?: { pendingCount: number; aiFlaggedCount: number },
    ) => {
      setSubmissions((cur) => {
        const idx = cur.findIndex((r) => r.id === checkinId);
        if (idx === -1) return cur;
        if (!rowMatchesView(newStatus)) return cur.filter((r) => r.id !== checkinId);
        const next = cur.slice();
        next[idx] = {
          ...next[idx],
          status: newStatus,
          ...(patch.reviewNote !== undefined ? { reviewNote: patch.reviewNote } : {}),
          ...(patch.reviewedAt !== undefined ? { reviewedAt: patch.reviewedAt } : {}),
          ...(patch.reviewedByName
            ? { reviewedBy: { id: next[idx].reviewedBy?.id ?? "", name: patch.reviewedByName } }
            : {}),
        };
        return next;
      });
      if (counts) {
        setPendingCount(counts.pendingCount);
        setAiFlaggedCount(counts.aiFlaggedCount);
      }
    },
    [rowMatchesView],
  );

  const buildUrl = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      // reset page to 1 when search or status changes
      if (overrides.search !== undefined || overrides.review !== undefined) {
        params.delete("page");
      }
      const qs = params.toString();
      return qs ? `?${qs}` : "";
    },
    [sp],
  );

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = searchInput.trim();
    router.push(buildUrl({ search: trimmed || null }));
  }

  function review(
    checkinId: string,
    action: "APPROVE" | "REJECT",
    note?: string
  ) {
    setErr(null);
    const snapshot = { rows: submissions, pending: pendingCount, ai: aiFlaggedCount };
    const wasPending =
      submissions.find((r) => r.id === checkinId)?.status === "PENDING";
    const optimisticStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";
    // Optimistic: flip the card / drop it from a pending view; nudge the count.
    applyReview(checkinId, optimisticStatus, { reviewNote: note ?? null, reviewedAt: new Date() });
    if (wasPending) setPendingCount((c) => Math.max(0, c - 1));
    start(async () => {
      const res = await reviewSubmissionAction({
        checkinId,
        action,
        note,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        // Reconcile to server truth (status + authoritative counts).
        applyReview(
          res.data.checkinId,
          res.data.status,
          {
            reviewNote: res.data.reviewNote,
            reviewedAt: res.data.reviewedAt ? new Date(res.data.reviewedAt) : null,
            reviewedByName: res.data.reviewedByName,
          },
          { pendingCount: res.data.pendingCount, aiFlaggedCount: res.data.aiFlaggedCount },
        );
      } else {
        // Roll back the optimistic mutation.
        setSubmissions(snapshot.rows);
        setPendingCount(snapshot.pending);
        setAiFlaggedCount(snapshot.ai);
        setErr(res.reason);
      }
    });
  }

  function flag(checkinId: string) {
    setErr(null);
    const snapshot = { rows: submissions, pending: pendingCount, ai: aiFlaggedCount };
    // Optimistic: back to PENDING (drops it from an APPROVED/REJECTED view).
    applyReview(checkinId, "PENDING", { reviewNote: null, reviewedAt: null });
    setPendingCount((c) => c + 1);
    start(async () => {
      const res = await flagSubmissionAction({
        checkinId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        applyReview(
          res.data.checkinId,
          res.data.status,
          {
            reviewNote: res.data.reviewNote,
            reviewedAt: res.data.reviewedAt ? new Date(res.data.reviewedAt) : null,
            reviewedByName: res.data.reviewedByName,
          },
          { pendingCount: res.data.pendingCount, aiFlaggedCount: res.data.aiFlaggedCount },
        );
      } else {
        setSubmissions(snapshot.rows);
        setPendingCount(snapshot.pending);
        setAiFlaggedCount(snapshot.ai);
        setErr(res.reason);
      }
    });
  }

  function approveAll() {
    setShowApproveAllConfirm(true);
  }

  function confirmApproveAll() {
    setShowApproveAllConfirm(false);
    setErr(null);
    const snapshot = { rows: submissions, pending: pendingCount, ai: aiFlaggedCount };
    const isPendingView = activeStatus === "PENDING" || activeStatus === "AI_FLAGGED";
    // Optimistic: in a pending view every pending row clears; elsewhere flip them.
    setSubmissions((cur) =>
      isPendingView
        ? cur.filter((r) => r.status !== "PENDING")
        : cur.map((r) =>
            r.status === "PENDING" ? { ...r, status: "APPROVED", reviewedAt: new Date() } : r,
          ),
    );
    setPendingCount(0);
    setAiFlaggedCount(0);
    start(async () => {
      const res = await approveAllPendingAction({
        challengeId,
        communitySlug,
        challengeSlug,
      });
      if (res.ok) {
        // Rows already reflect the bulk approve; reconcile counts to server truth.
        setPendingCount(res.pendingCount);
        setAiFlaggedCount(res.aiFlaggedCount);
      } else {
        setSubmissions(snapshot.rows);
        setPendingCount(snapshot.pending);
        setAiFlaggedCount(snapshot.ai);
        setErr(res.reason);
      }
    });
  }

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <ConfirmModal
        open={showApproveAllConfirm}
        title="Duyệt tất cả submission"
        message={`Duyệt tất cả ${pendingCount} submission đang chờ?`}
        confirmLabel="Duyệt tất cả"
        onConfirm={confirmApproveAll}
        onCancel={() => setShowApproveAllConfirm(false)}
      />
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

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 10, display: "flex", gap: 8 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm theo tên…"
          style={{
            flex: 1,
            padding: "7px 10px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-chat)",
            color: "var(--text-normal)",
            fontSize: "var(--text-sm)",
            fontFamily: "inherit",
            outline: "none",
            maxWidth: 260,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-modifier-hover)",
            color: "var(--text-normal)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🔍 Tìm
        </button>
        {search && (
          <Link
            href={buildUrl({ search: null })}
            scroll={false}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            ✕ Xoá
          </Link>
        )}
      </form>

      {/* Status filter tabs — horizontally scrollable so they never wrap on mobile */}
      <div className="review-tab-bar">
        {(
          [
            { key: "ALL", label: "Tất cả" },
            { key: "AI_FLAGGED", label: `🤖 AI Flagged${aiFlaggedCount > 0 ? ` (${aiFlaggedCount})` : ""}` },
            { key: "PENDING", label: `Chờ (${pendingCount})` },
            { key: "APPROVED", label: "Đã duyệt" },
            { key: "REJECTED", label: "Từ chối" },
          ] as const
        ).map((t) => (
          <Link
            key={t.key}
            href={buildUrl({ review: t.key.toLowerCase() })}
            scroll={false}
            className="review-tab"
            style={{
              color:
                activeStatus === t.key
                  ? "var(--header-primary)"
                  : "var(--text-muted)",
              borderBottom:
                activeStatus === t.key
                  ? "2px solid var(--brand-green)"
                  : "2px solid transparent",
              fontWeight: activeStatus === t.key ? 600 : 400,
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginTop: 16,
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
          }}
        >
          {page > 1 ? (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              scroll={false}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-modifier-hover)",
                color: "var(--text-normal)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              ← Trước
            </Link>
          ) : (
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                fontSize: "var(--text-xs)",
                opacity: 0.4,
              }}
            >
              ← Trước
            </span>
          )}
          <span>
            Trang {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              scroll={false}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-modifier-hover)",
                color: "var(--text-normal)",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Sau →
            </Link>
          ) : (
            <span
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
                fontSize: "var(--text-xs)",
                opacity: 0.4,
              }}
            >
              Sau →
            </span>
          )}
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
  const [aiReasoningExpanded, setAiReasoningExpanded] = useState(false);
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
      <div className="submission-card-row">
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
            {submission.aiReviewData && (
              <AIReviewBadge
                data={submission.aiReviewData}
                expanded={aiReasoningExpanded}
                onToggle={() => setAiReasoningExpanded(!aiReasoningExpanded)}
              />
            )}
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
            <LinkifiedText>{submission.content}</LinkifiedText>
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
          {submission.imageUrls.length > 0 && (
            <div style={{ marginTop: 6, marginBottom: 4 }}>
              <SubmissionImageCarousel images={submission.imageUrls} alt="evidence" compact />
            </div>
          )}

          {submission.aiReviewData && (
            <AgentReviewCard
              data={submission.aiReviewData}
              status={submission.status}
              compact
            />
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

function AIReviewBadge({
  data,
  expanded,
  onToggle,
}: {
  data: AIReviewData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const confidencePercent = Math.round(data.confidence * 100);

  const badgeColor = (() => {
    switch (data.decision) {
      case "APPROVE":
        return {
          color: "var(--success)",
          background: "rgba(36,128,70,0.12)",
        };
      case "REJECT":
        return {
          color: "var(--danger)",
          background: "rgba(218,55,60,0.1)",
        };
      case "FLAG":
        return {
          color: "var(--warning)",
          background: "rgba(240,178,50,0.14)",
        };
      default:
        return {
          color: "var(--text-muted)",
          background: "var(--bg-modifier-hover)",
        };
    }
  })();

  const label = (() => {
    switch (data.decision) {
      case "APPROVE":
        return `🤖 AI Approved (${confidencePercent}%)`;
      case "REJECT":
        return `🤖 AI Rejected (${confidencePercent}%)`;
      case "FLAG":
        return `🤖 AI Flagged (${confidencePercent}%)`;
      default:
        return `🤖 AI Review (${confidencePercent}%)`;
    }
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        onClick={onToggle}
        style={{
          ...badgeStyle,
          color: badgeColor.color,
          background: badgeColor.background,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {label}
      </span>
      {expanded && (
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            padding: 8,
            background: "var(--bg-modifier-hover)",
            borderRadius: 4,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {data.reasoning}
        </div>
      )}
    </div>
  );
}
