import Link from "next/link";
import { signOut } from "@/auth";
import { LoginModal } from "./login-modal";

export function UserPanel({
  user,
  subtitle,
  profileHref,
  notifUnread,
  chatHref,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null } | null | undefined;
  subtitle?: string;
  /** When set, the avatar + name block links to this URL (e.g. /c/<slug>/profile). */
  profileHref?: string;
  notifUnread?: number;
  chatHref?: string;
}) {
  const displayName = user?.name || user?.email || "Guest";

  const avatarBlock = (
    <>
      <div className="user-panel-avatar">
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="user-panel-avatar-img"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="user-panel-avatar-img">
            {displayName[0]?.toUpperCase()}
          </div>
        )}
        <div className="status-dot"></div>
      </div>
      <div className="user-panel-info">
        <div className="user-panel-name">{displayName}</div>
        <div className="user-panel-status-text">
          {subtitle || (user ? "Online" : "Guest")}
        </div>
      </div>
    </>
  );

  return (
    <div className="user-panel">
      {profileHref && user ? (
        <Link
          href={profileHref}
          className="user-panel-left"
          title="Mở profile"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {avatarBlock}
        </Link>
      ) : (
        <div
          className="user-panel-left"
          title={user ? "Profile (đang hoàn thiện)" : "Đăng nhập để xem profile"}
        >
          {avatarBlock}
        </div>
      )}
      <div className="user-panel-actions">
        {user && chatHref && (
          <Link href={chatHref} title="Chat" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--interactive-normal)" }}>
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "currentColor" }}>
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
            </svg>
          </Link>
        )}
        {user && (
          <Link href="/inbox" title="Thông báo" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: "var(--interactive-normal)" }}>
            <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, fill: "currentColor" }}>
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            {!!notifUnread && notifUnread > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, background: "var(--danger)", color: "#fff", borderRadius: "50%", fontSize: 9, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1, padding: "0 2px" }}>
                {notifUnread > 9 ? "9+" : notifUnread}
              </span>
            )}
          </Link>
        )}
        {user ? (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            style={{ display: "inline" }}
          >
            <button type="submit" title="Đăng xuất">
              <svg viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
            </button>
          </form>
        ) : (
          <LoginModal
            trigger={
              <button title="Đăng nhập">
                <svg viewBox="0 0 24 24">
                  <path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z" />
                </svg>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
