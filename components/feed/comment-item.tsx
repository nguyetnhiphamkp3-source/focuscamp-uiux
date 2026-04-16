"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  avatarColorFor,
  nameColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";
import {
  markBestAnswerAction,
  deleteCommentAction,
  createCommentAction,
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
  replies = [],
  postId,
  communitySlug,
  currentUser,
  isOwner,
  postAuthorId,
  isQuestion,
  depth = 0,
}: {
  comment: CommentItemData;
  replies?: CommentItemData[];
  postId: string;
  communitySlug: string;
  /** Logged-in user (null when guest / non-member) — enables Reply button */
  currentUser: { id: string; name: string | null; image: string | null } | null;
  isOwner: boolean;
  postAuthorId: string;
  isQuestion: boolean;
  depth?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const authorName = comment.user.name || "Ẩn danh";
  const nameColor = nameColorFor(comment.user.id);
  const canMarkBest =
    !!currentUser && (currentUser.id === postAuthorId || isOwner);
  const canDelete =
    !!currentUser && (currentUser.id === comment.user.id || isOwner);
  const canReply = !!currentUser && depth < 3; // cap nesting depth

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
    if (!confirm("Xoá comment này? (Các trả lời bên dưới cũng sẽ xoá)")) return;
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

  function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setErr(null);
    start(async () => {
      const res = await createCommentAction({
        postId,
        parentId: comment.id,
        body: replyBody.trim(),
        communitySlug,
      });
      if (res.ok) {
        setReplyBody("");
        setReplying(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
    });
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: 12,
          background: comment.isBestAnswer
            ? "rgba(36,128,70,0.06)"
            : "var(--bg-card)",
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
            <span style={{ color: nameColor, fontWeight: 600 }}>
              {authorName}
            </span>
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "var(--text-xs)",
              }}
            >
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

          {(canMarkBest || canDelete || canReply) && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                fontSize: "var(--text-xs)",
              }}
            >
              {canReply && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  style={actionBtnStyle("var(--interactive-normal)")}
                >
                  {replying ? "Huỷ trả lời" : "↩ Trả lời"}
                </button>
              )}
              {canMarkBest && (
                <button
                  type="button"
                  onClick={toggleBest}
                  disabled={pending}
                  style={actionBtnStyle(
                    comment.isBestAnswer
                      ? "var(--success)"
                      : "var(--interactive-normal)",
                    600
                  )}
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
                  style={actionBtnStyle("var(--danger)")}
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

          {replying && currentUser && (
            <form
              onSubmit={submitReply}
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder={`Trả lời ${authorName}…`}
                rows={2}
                maxLength={5000}
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
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setReplying(false);
                    setReplyBody("");
                  }}
                  disabled={pending}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    background: "transparent",
                    color: "var(--interactive-normal)",
                    fontSize: "var(--text-xs)",
                    cursor: "pointer",
                  }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={!replyBody.trim() || pending}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "none",
                    background: replyBody.trim()
                      ? "var(--brand-green)"
                      : "var(--bg-modifier-hover)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "var(--text-xs)",
                    cursor: replyBody.trim() ? "pointer" : "not-allowed",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? "Đang gửi…" : "Gửi trả lời"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div
          style={{
            marginLeft: 28,
            paddingLeft: 12,
            borderLeft: "2px solid var(--border-subtle)",
          }}
        >
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              replies={[]}
              postId={postId}
              communitySlug={communitySlug}
              currentUser={currentUser}
              isOwner={isOwner}
              postAuthorId={postAuthorId}
              isQuestion={isQuestion}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function actionBtnStyle(color: string, weight: number = 400): React.CSSProperties {
  return {
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    color,
    fontWeight: weight,
  };
}
