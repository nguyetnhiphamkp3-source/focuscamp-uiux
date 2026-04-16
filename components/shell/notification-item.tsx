"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationReadAction } from "@/app/actions/notifications";
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
};

const TYPE_ICON: Record<string, string> = {
  POST_COMMENT: "💬",
  COMMENT_REPLY: "↩️",
  POST_REACTION: "❤️",
  BEST_ANSWER: "★",
  POST_COT: "⭐",
  SUBMISSION_APPROVED: "✓",
  SUBMISSION_REJECTED: "✕",
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

  const actorName = n.actor?.name ?? "focus.camp";

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
      {/* Actor avatar if present, else type icon */}
      {n.actor ? (
        n.actor.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.actor.image}
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
              background: avatarColorFor(n.actor.id),
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(actorName)}
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

export function MarkAllReadLink() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await import("@/app/actions/notifications").then((m) =>
            m.markAllReadAction()
          );
          if (res.ok) router.refresh();
        });
      }}
      style={{
        background: "transparent",
        border: "none",
        color: "var(--brand-green)",
        fontSize: "var(--text-sm)",
        cursor: "pointer",
        fontWeight: 600,
      }}
    >
      {pending ? "Đang…" : "Đánh dấu tất cả là đã đọc"}
    </button>
  );
}
