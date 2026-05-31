import Link from "next/link";
import { signOut } from "@/auth";
import { LoginModal } from "./login-modal";
import { MessageSquare, Bell, LogOut, LogIn } from "lucide-react";

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
            <MessageSquare size={20} />
          </Link>
        )}
        {user && (
          <Link href="/inbox" title="Thông báo" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "relative", color: "var(--interactive-normal)" }}>
            <Bell size={20} />
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
              <LogOut size={20} />
            </button>
          </form>
        ) : (
          <LoginModal
            trigger={
              <button title="Đăng nhập">
                <LogIn size={20} />
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
