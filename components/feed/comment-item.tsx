"use client";

import { useEffect, useRef, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal, Reply, Pencil, Star, Check, Flag, Trash2 } from "lucide-react";
import {
  avatarColorFor,
  nameColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { LinkifiedText } from "@/components/shared/linkified-text";
import { ReportModal } from "./report-modal";
import {
  markBestAnswerAction,
  deleteCommentAction,
  createCommentAction,
  updateCommentAction,
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
  const [editing, setEditing] = useState(false);
  const [displayBody, setDisplayBody] = useState(comment.body);
  const [editBody, setEditBody] = useState(comment.body);

  const authorName = comment.user.name || "Ẩn danh";
  const nameColor = nameColorFor(comment.user.id);
  const canMarkBest =
    !!currentUser && (currentUser.id === postAuthorId || isOwner);
  const canEdit = !!currentUser && currentUser.id === comment.user.id;
  const canDelete =
    !!currentUser && (currentUser.id === comment.user.id || isOwner);
  const canReply = !!currentUser && depth < 3; // cap nesting depth
  const canReport = !!currentUser && currentUser.id !== comment.user.id;
  const [showReportModal, setShowReportModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const hasMenuActions = canEdit || canMarkBest || canDelete || canReport;

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!menuBtnRef.current?.parentElement?.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [menuOpen]);

  useEffect(() => {
    setDisplayBody(comment.body);
    setEditBody(comment.body);
  }, [comment.body]);

  function toggleBest() {
    setErr(null);
    start(async () => {
      const res = await markBestAnswerAction({
        commentId: comment.id,
        postId,
        communitySlug,
      });
      if (res.ok) window.location.reload();
      else setErr(res.reason);
    });
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function onDelete() {
    setShowDeleteConfirm(true);
  }

  function confirmDelete() {
    setShowDeleteConfirm(false);
    setErr(null);
    start(async () => {
      const res = await deleteCommentAction({
        commentId: comment.id,
        postId,
        communitySlug,
      });
      if (res.ok) window.location.reload();
      else setErr(res.reason);
    });
  }

  function saveEdit() {
    setErr(null);
    const nextBody = editBody.trim();
    if (!nextBody) return;
    start(async () => {
      const res = await updateCommentAction({
        commentId: comment.id,
        body: nextBody,
        postId,
        communitySlug,
      });
      if (res.ok) {
        const savedBody = res.data?.body ?? nextBody;
        setDisplayBody(savedBody);
        setEditBody(savedBody);
        setEditing(false);
        router.refresh();
      } else {
        setErr(res.reason);
      }
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
        window.location.reload();
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
        <Link
          href={`/c/${communitySlug}/profile/${comment.user.id}`}
          aria-label={`Xem profile của ${authorName}`}
          style={{ flexShrink: 0 }}
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
                background: avatarColorFor(comment.user.id),
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
              href={`/c/${communitySlug}/profile/${comment.user.id}`}
              style={{
                color: nameColor,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {authorName}
            </Link>
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
                <Check size={13} style={{ verticalAlign: "-2px" }} /> {isQuestion ? "Câu trả lời tốt nhất" : "Được ghim"}
              </span>
            )}
          </div>
          {editing ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={3}
                maxLength={5000}
                disabled={pending}
                autoFocus
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
                    setEditing(false);
                    setEditBody(displayBody);
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
                  type="button"
                  onClick={saveEdit}
                  disabled={pending || !editBody.trim()}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 6,
                    border: "none",
                    background: editBody.trim()
                      ? "var(--brand-green)"
                      : "var(--bg-modifier-hover)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "var(--text-xs)",
                    cursor: editBody.trim() ? "pointer" : "not-allowed",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  {pending ? "Đang lưu…" : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-normal)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <LinkifiedText>{displayBody}</LinkifiedText>
            </div>
          )}

          {!editing && (canReply || hasMenuActions) && (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 8,
                fontSize: "var(--text-xs)",
                alignItems: "center",
              }}
            >
              {canReply && (
                <button
                  type="button"
                  onClick={() => setReplying((v) => !v)}
                  style={actionBtnStyle("var(--interactive-normal)")}
                >
                  {replying ? (
                    "Huỷ trả lời"
                  ) : (
                    <>
                      <Reply size={13} style={{ verticalAlign: "-2px" }} /> Trả lời
                    </>
                  )}
                </button>
              )}
              {comment.isBestAnswer && canMarkBest && (
                <span
                  style={{
                    color: "var(--success)",
                    fontWeight: 600,
                    fontSize: "var(--text-xs)",
                  }}
                >
                  ✓ Đã đánh dấu
                </span>
              )}
              {hasMenuActions && (
                <div style={{ position: "relative", marginLeft: "auto" }}>
                  <button
                    ref={menuBtnRef}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((v) => !v);
                    }}
                    aria-label="Tuỳ chọn comment"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      padding: "2px 6px",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      lineHeight: 1,
                      borderRadius: 4,
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        right: 0,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        padding: 4,
                        minWidth: 180,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        zIndex: 10,
                      }}
                    >
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setEditBody(displayBody);
                            setEditing(true);
                          }}
                          style={menuItemStyle("var(--text-normal)")}
                        >
                          <Pencil size={15} /> Sửa
                        </button>
                      )}
                      {canMarkBest && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            toggleBest();
                          }}
                          disabled={pending}
                          style={menuItemStyle(
                            comment.isBestAnswer
                              ? "var(--success)"
                              : "var(--text-normal)",
                          )}
                        >
                          {comment.isBestAnswer ? (
                            <>
                              <Check size={15} /> Bỏ đánh dấu
                            </>
                          ) : (
                            <>
                              <Star size={15} />{" "}
                              {isQuestion ? "Đánh dấu best answer" : "Ghim comment"}
                            </>
                          )}
                        </button>
                      )}
                      {canReport && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setShowReportModal(true);
                          }}
                          style={menuItemStyle("var(--text-normal)")}
                        >
                          <Flag size={15} /> Báo cáo
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onDelete();
                          }}
                          disabled={pending}
                          style={menuItemStyle("var(--danger)")}
                        >
                          <Trash2 size={15} /> Xoá
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

      <ConfirmModal
        open={showDeleteConfirm}
        title="Xoá comment"
        message="Xoá comment này? Các trả lời bên dưới cũng sẽ bị xoá."
        confirmLabel="Xoá"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ReportModal
        open={showReportModal}
        targetType="COMMENT"
        commentId={comment.id}
        communitySlug={communitySlug}
        onClose={() => setShowReportModal(false)}
      />

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

function menuItemStyle(color: string): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 12px",
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "var(--text-sm)",
    color,
    fontFamily: "inherit",
  };
}
