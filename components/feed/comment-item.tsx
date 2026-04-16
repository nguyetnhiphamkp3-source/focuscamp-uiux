"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { avatarColorFor, nameColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import {
  markBestAnswerAction,
  deleteCommentAction,
} from "@/app/actions/comments";

export type CommentItemData = {
  id: string;
  body: string;
  isBestAnswer: boolean;
  parentId: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
};

export function CommentItem({
  comment,
  postId,
  communitySlug,
  canMarkBest,
  canDelete,
  isQuestion,
}: {
  comment: CommentItemData;
  postId: string;
  communitySlug: string;
  /** Post author OR community owner — shows ★ toggle */
  canMarkBest: boolean;
  /** Comment author OR community owner — shows Xoá */
  canDelete: boolean;
  /** If parent post is QUESTION, use "Best answer" label */
  isQuestion: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const authorName = comment.user.name || "Ẩn danh";
  const nameColor = nameColorFor(comment.user.id);

  function toggleBest() {
    setErr(null);
    start(async () => {
      const res = await markBestAnswerAction({
        commentId: comment.id,
        postId,
        communitySlug,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  function onDelete() {
    if (!confirm("Xoá comment này?")) return;
    setErr(null);
    start(async () => {
      const res = await deleteCommentAction({
        commentId: comment.id,
        postId,
        communitySlug,
      });
      if (res.ok) router.refresh();
      else setErr(res.reason);
    });
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: 12,
        background: comment.isBestAnswer ? "rgba(36,128,70,0.06)" : "var(--bg-card)",
        border: comment.isBestAnswer
          ? "1px solid var(--success)"
          : "1px solid var(--border-subtle)",
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      {comment.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={comment.user.image}
          alt=""
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            flexShrink: 0,
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: avatarColorFor(comment.user.id),
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "var(--text-sm)",
            flexShrink: 0,
          }}
        >
          {initials(authorName)}
        </div>
      )}
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
          <span style={{ color: nameColor, fontWeight: 600 }}>{authorName}</span>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
            {fmtRelativeTime(comment.createdAt)}
          </span>
          {comment.isBestAnswer && (
            <span
              style={{
                color: "var(--success)",
                fontWeight: 700,
                fontSize: "var(--text-xs)",
                padding: "2px 8px",
                background: "rgba(36,128,70,0.12)",
                borderRadius: 10,
              }}
            >
              ✓ {isQuestion ? "Câu trả lời tốt nhất" : "Được ghim"}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "var(--text-base)",
            color: "var(--text-normal)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {comment.body}
        </div>
        {(canMarkBest || canDelete) && (
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 8,
              fontSize: "var(--text-xs)",
            }}
          >
            {canMarkBest && (
              <button
                type="button"
                onClick={toggleBest}
                disabled={pending}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: comment.isBestAnswer
                    ? "var(--success)"
                    : "var(--interactive-normal)",
                  fontWeight: 600,
                }}
              >
                {comment.isBestAnswer
                  ? "✓ Đã đánh dấu"
                  : isQuestion
                    ? "★ Đánh dấu best answer"
                    : "★ Ghim comment"}
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={pending}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "var(--danger)",
                }}
              >
                Xoá
              </button>
            )}
          </div>
        )}
        {err && (
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--danger)",
              marginTop: 4,
            }}
          >
            {err}
          </div>
        )}
      </div>
    </div>
  );
}
