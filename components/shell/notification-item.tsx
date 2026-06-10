"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import {
  clearAllNotificationsAction,
  clearReadNotificationsAction,
  markAllReadAction,
  markNotificationReadAction,
} from "@/app/actions/notifications";
import { ConfirmModal } from "@/components/shared/confirm-modal";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";

export type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor: { id: string; name: string | null; image: string | null } | null;
  community?: { slug: string; name: string; iconUrl: string | null } | null;
};

const TYPE_ICON: Record<string, string> = {
  POST_COMMENT: "💬",
  COMMENT_REPLY: "↩️",
  POST_REACTION: "❤️",
  BEST_ANSWER: "★",
  POST_COT: "⭐",
  SUBMISSION_APPROVED: "✓",
  SUBMISSION_REJECTED: "✕",
  SUBMISSION_REOPENED: "↻",
  FOLLOW: "👥",
  UNFOLLOW: "👤",
};

export function NotificationItem({ n }: { n: InboxItem }) {
  const router = useRouter();
  const [, start] = useTransition();
  const unread = !n.readAt;
  const icon = TYPE_ICON[n.type] ?? "🔔";

  function onClick() {
    if (unread) {
      start(async () => {
        await markNotificationReadAction({ notificationId: n.id });
        // Navigate AFTER marking read so page shows updated state
        if (n.link) router.push(n.link);
        else router.refresh();
      });
    } else if (n.link) {
      router.push(n.link);
    }
  }

  // Submission decisions are attributed to the community (not the reviewing
  // admin), so they show the community icon. Everything else uses the actor.
  const isReviewDecision =
    n.type === "SUBMISSION_APPROVED" ||
    n.type === "SUBMISSION_REJECTED" ||
    n.type === "SUBMISSION_REOPENED";
  const avatar =
    isReviewDecision
      ? n.community
        ? { image: n.community.iconUrl, colorKey: n.community.slug, label: n.community.name }
        : { image: null, colorKey: `review:${n.type}`, label: "Admin" }
      : n.actor
        ? { image: n.actor.image, colorKey: n.actor.id, label: n.actor.name ?? "focus.camp" }
        : null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 14px",
        background: unread
          ? "rgba(27,158,117,0.06)"
          : "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderLeft: unread ? "3px solid var(--brand-green)" : "1px solid var(--border-subtle)",
        borderRadius: 10,
        marginBottom: 8,
        cursor: n.link || unread ? "pointer" : "default",
        alignItems: "flex-start",
      }}
    >
      {/* Community/actor avatar if present, else type icon */}
      {avatar ? (
        avatar.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar.image}
            alt=""
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: avatarColorFor(avatar.colorKey),
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(avatar.label)}
          </div>
        )
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "var(--bg-modifier-hover)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: unread ? 700 : 500,
              color: "var(--header-primary)",
            }}
          >
            {n.title}
          </span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginLeft: "auto",
            }}
          >
            {fmtRelativeTime(n.createdAt)}
          </span>
        </div>
        {n.body && (
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-normal)",
              lineHeight: 1.45,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {n.body}
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationBulkActions({
  unread,
  hasRead,
  hasAny,
}: {
  unread: number;
  hasRead: boolean;
  hasAny: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [confirmTarget, setConfirmTarget] = useState<"read" | "all" | null>(null);

  if (!hasAny) return null;

  function markAllRead() {
    start(async () => {
      const res = await markAllReadAction();
      if (res.ok) router.refresh();
    });
  }

  function confirmDelete() {
    const target = confirmTarget;
    if (!target) return;
    setConfirmTarget(null);
    start(async () => {
      const res =
        target === "read"
          ? await clearReadNotificationsAction()
          : await clearAllNotificationsAction();
      if (res.ok) router.refresh();
    });
  }

  const confirmCopy =
    confirmTarget === "read"
      ? {
          title: "Xoá thông báo đã đọc",
          message: "Xoá toàn bộ thông báo đã đọc khỏi inbox của bạn?",
          label: "Xoá đã đọc",
        }
      : {
          title: "Xoá tất cả thông báo",
          message: "Xoá toàn bộ inbox thông báo của bạn? Hành động này không thể hoàn tác.",
          label: "Xoá tất cả",
        };

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "flex-end",
      }}
    >
      <ConfirmModal
        open={confirmTarget !== null}
        title={confirmCopy.title}
        message={confirmCopy.message}
        confirmLabel={confirmCopy.label}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
      {unread > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={markAllRead}
          style={actionButtonStyle("primary", pending)}
        >
          {pending ? "Đang…" : "Đánh dấu tất cả đã đọc"}
        </button>
      )}
      <button
        type="button"
        disabled={pending || !hasRead}
        onClick={() => setConfirmTarget("read")}
        style={actionButtonStyle("secondary", pending || !hasRead)}
      >
        Xoá đã đọc
      </button>
      <button
        type="button"
        disabled={pending || !hasAny}
        onClick={() => setConfirmTarget("all")}
        style={actionButtonStyle("danger", pending || !hasAny)}
      >
        Xoá tất cả
      </button>
    </div>
  );
}

function actionButtonStyle(
  tone: "primary" | "secondary" | "danger",
  disabled: boolean,
): CSSProperties {
  const color =
    tone === "primary"
      ? "var(--brand-green)"
      : tone === "danger"
        ? "var(--danger)"
        : "var(--text-muted)";
  return {
    background: "transparent",
    border: "1px solid var(--border-subtle)",
    borderRadius: 8,
    color,
    fontSize: "var(--text-sm)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
    padding: "7px 10px",
    opacity: disabled ? 0.45 : 1,
    whiteSpace: "nowrap",
  };
}
