"use client";

import { Bell, Search, X, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import { markNotificationReadAction, markAllReadAction } from "@/app/actions/notifications";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

/* ─── Types ─────────────────────────────────────────────────────────── */
export type NotifItem = {
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

/* ─── Demo data (hiển thị khi chưa có thông báo thật) ───────────────── */
const DEMO: NotifItem[] = [
  {
    id: "d1",
    type: "POST_COMMENT",
    title: "Minh Anh đã comment bài viết của bạn",
    body: "Bài viết rất hay! Mình đã áp dụng được ngay hôm nay rồi 🔥",
    link: null,
    readAt: null,
    createdAt: new Date(Date.now() - 4 * 60 * 1000),
    actor: { id: "u1", name: "Minh Anh", image: null },
  },
  {
    id: "d2",
    type: "FOLLOW",
    title: "Tuấn Kiệt đã follow bạn",
    body: null,
    link: null,
    readAt: null,
    createdAt: new Date(Date.now() - 22 * 60 * 1000),
    actor: { id: "u2", name: "Tuấn Kiệt", image: null },
  },
  {
    id: "d3",
    type: "COMMENT_REPLY",
    title: "Thu Hà đã reply comment của bạn",
    body: "Đúng rồi! Mình cũng thấy vậy, thử áp dụng GTD xem sao nhé.",
    link: null,
    readAt: null,
    createdAt: new Date(Date.now() - 55 * 60 * 1000),
    actor: { id: "u3", name: "Thu Hà", image: null },
  },
  {
    id: "d4",
    type: "SUBMISSION_APPROVED",
    title: "Checkin ngày 12 được duyệt ✓",
    body: "Bài nộp Challenge '30 ngày đọc sách' của bạn đã được approve. Giữ lửa!",
    link: null,
    readAt: new Date(),
    createdAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
    actor: null,
    community: { slug: "focus-camp", name: "Focus Camp", iconUrl: null },
  },
  {
    id: "d5",
    type: "POST_REACTION",
    title: "5 người vừa thả tim bài của bạn",
    body: "Bài chia sẻ về thói quen buổi sáng đang được nhiều người yêu thích.",
    link: null,
    readAt: new Date(),
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    actor: { id: "u4", name: "Hồng Ngọc", image: null },
  },
  {
    id: "d6",
    type: "POST_COT",
    title: "Bài viết của bạn được ghim lên Cốt",
    body: "Admin đã ghim bài 'Tóm tắt tuần 3 của mình' vào Cốt cộng đồng.",
    link: null,
    readAt: new Date(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    actor: { id: "u5", name: "Admin", image: null },
  },
];

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
};

/* ─── Notification row ──────────────────────────────────────────────── */
function NotifRow({
  n,
  onRead,
}: {
  n: NotifItem;
  onRead: (id: string) => void;
}) {
  const unread = !n.readAt;
  const icon = TYPE_ICON[n.type] ?? "🔔";

  const isReviewDecision =
    n.type === "SUBMISSION_APPROVED" ||
    n.type === "SUBMISSION_REJECTED" ||
    n.type === "SUBMISSION_REOPENED";

  const avatar =
    isReviewDecision
      ? n.community
        ? { image: n.community.iconUrl, colorKey: n.community.slug, label: n.community.name }
        : { image: null, colorKey: "review", label: "Admin" }
      : n.actor
        ? { image: n.actor.image, colorKey: n.actor.id, label: n.actor.name ?? "?" }
        : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => unread && onRead(n.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && unread && onRead(n.id)}
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 14px",
        background: unread ? "rgba(27,158,117,0.06)" : "transparent",
        borderRadius: 10,
        cursor: unread ? "pointer" : "default",
        alignItems: "flex-start",
        transition: "background 120ms",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (!unread) (e.currentTarget as HTMLElement).style.background = "var(--bg-modifier-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = unread ? "rgba(27,158,117,0.06)" : "transparent";
      }}
    >
      {/* Unread dot */}
      {unread && (
        <div style={{
          position: "absolute",
          left: 4,
          top: "50%",
          transform: "translateY(-50%)",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--brand-green)",
        }} />
      )}

      {/* Avatar */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {avatar?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar.image} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
        ) : avatar ? (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: avatarColorFor(avatar.colorKey),
            color: "#fff", display: "flex", alignItems: "center",
            justifyContent: "center", fontWeight: 700, fontSize: 13,
          }}>
            {initials(avatar.label)}
          </div>
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "var(--bg-elevated)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {icon}
          </div>
        )}
        {/* type icon badge */}
        {avatar && (
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: "var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, lineHeight: 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "var(--text-sm)",
          fontWeight: unread ? 600 : 400,
          color: "var(--header-primary)",
          lineHeight: 1.4,
          marginBottom: 2,
        }}>
          {n.title}
        </div>
        {n.body && (
          <div style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}>
            {n.body}
          </div>
        )}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 3, opacity: 0.7 }}>
          {fmtRelativeTime(n.createdAt)}
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */
export function NotifBell({
  initial = 0,
  items: serverItems,
}: {
  initial?: number;
  items?: NotifItem[];
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"inbox" | "archive">("inbox");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<NotifItem[]>(serverItems ?? DEMO);
  const [, startTransition] = useTransition();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);

  const unreadCount = items.filter((n) => !n.readAt).length;

  /* Position popup above the bell button */
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      bottom: window.innerHeight - rect.top + 8,
      left: Math.max(8, rect.left - 340 + rect.width),
    });
  }, [open]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date() } : n));
    startTransition(async () => {
      if (!id.startsWith("d")) {
        await markNotificationReadAction({ notificationId: id });
        router.refresh();
      }
    });
  }

  function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });
  }

  const inboxItems = items.filter((n) => !n.readAt || tab === "inbox");
  const archiveItems = items.filter((n) => !!n.readAt);
  const displayed = (tab === "inbox" ? inboxItems : archiveItems).filter((n) =>
    search === "" ||
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.body ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* Bell button */}
      <button
        ref={btnRef}
        type="button"
        title="Thông báo"
        className="up-action"
        onClick={() => setOpen((v) => !v)}
        style={{ position: "relative" }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: "var(--danger)", color: "#fff",
            borderRadius: "50%", fontSize: 9, minWidth: 14, height: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, lineHeight: 1, padding: "0 2px",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popup — rendered via portal to escape .user-panel-actions button CSS */}
      {open && pos && createPortal(
        <div
          ref={popupRef}
          style={{
            position: "fixed",
            bottom: pos.bottom,
            left: pos.left,
            width: 380,
            maxHeight: "70vh",
            background: "var(--bg-card)",
            borderRadius: "var(--r-xl)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--header-primary)" }}>
                Thông báo
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    style={{
                      fontSize: "var(--text-xs)", fontWeight: 600,
                      color: "var(--brand-green)", background: "none",
                      border: "none", cursor: "pointer", padding: "4px 6px",
                      borderRadius: 6,
                    }}
                  >
                    Đọc hết
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "var(--bg-elevated)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "var(--text-muted)",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, padding: "4px 0 0" }}>
              {(["inbox", "archive"] as const).map((tabKey) => {
                const labels = { inbox: t("notifInbox"), archive: t("notifRead") };
                const count = tabKey === "inbox" ? unreadCount : archiveItems.length;
                const active = tab === tabKey;
                return (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setTab(tabKey)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 20,
                      fontSize: "var(--text-sm)",
                      fontWeight: active ? 700 : 500,
                      color: active ? "var(--header-primary)" : "var(--text-muted)",
                      background: active ? "var(--bg-elevated)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      transition: "background 120ms, color 120ms",
                    }}
                  >
                    {labels[tabKey]}
                    {count > 0 && (
                      <span style={{
                        background: active && tabKey === "inbox" ? "var(--brand-green)" : "rgba(0,0,0,0.08)",
                        color: active && tabKey === "inbox" ? "#fff" : "var(--text-muted)",
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        lineHeight: "14px",
                        display: "inline-flex",
                        alignItems: "center",
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 -16px" }} />

            {/* Search + Filter */}
            <div style={{ display: "flex", gap: 8, padding: "10px 0 8px" }}>
              <div style={{
                flex: 1, display: "flex", alignItems: "center", gap: 8,
                background: "var(--bg-elevated)", borderRadius: "var(--r-full)",
                padding: "7px 12px",
              }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm thông báo..."
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    fontSize: "var(--text-sm)", color: "var(--text-normal)",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <button
                type="button"
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 12px", borderRadius: "var(--r-full)",
                  background: "var(--bg-elevated)", border: "none",
                  fontSize: "var(--text-sm)", fontWeight: 600,
                  color: "var(--text-muted)", cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <SlidersHorizontal size={13} />
                Lọc
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 6px" }}>
            {displayed.length === 0 ? (
              <div style={{
                padding: "40px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>
                  {tab === "inbox" ? "🔔" : "📭"}
                </div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                  {search
                    ? "Không tìm thấy thông báo nào"
                    : tab === "inbox"
                      ? "Không có thông báo mới"
                      : "Chưa có thông báo đã đọc"}
                </div>
              </div>
            ) : (
              displayed.map((n) => (
                <NotifRow key={n.id} n={n} onRead={markRead} />
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 14px",
            borderTop: "none",
            background: "rgba(27,158,117,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}>
            <Bell size={16} color="var(--brand-green)" />
            <span style={{ flex: 1, fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Bật thông báo để nhận cập nhật ngay lập tức
            </span>
            <button
              type="button"
              onClick={() => {
                if ("Notification" in window) Notification.requestPermission();
              }}
              style={{
                padding: "5px 10px", borderRadius: "var(--r-full)",
                background: "var(--header-primary)", color: "#fff",
                border: "none", fontSize: "var(--text-xs)",
                fontWeight: 600, cursor: "pointer", flexShrink: 0,
              }}
            >
              Bật
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
