import Link from "next/link";
import { signOut } from "@/auth";
import { LoginModal } from "./login-modal";
import { WallpaperButton } from "./wallpaper-button";
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

  if (!user) {
    return (
      <div className="user-panel" style={{ padding: "8px 12px" }}>
        <LoginModal
          trigger={
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                background: "var(--brand-green)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                color: "#fff",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "var(--text-sm)",
              }}
            >
              <LogIn size={16} />
              Đăng nhập để trải nghiệm
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="user-panel">
      {profileHref ? (
        <Link
          href={profileHref}
          prefetch={false}
          className="user-panel-left"
          title="Mở profile"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {avatarBlock}
        </Link>
      ) : (
        <div className="user-panel-left" title="Profile (đang hoàn thiện)">
          {avatarBlock}
        </div>
      )}
      <div className="user-panel-actions">
        <WallpaperButton />
        {chatHref && (
          <Link href={chatHref} prefetch={false} title="Chat" className="up-action">
            <MessageSquare size={20} />
          </Link>
        )}
        <Link href="/inbox" prefetch={false} title="Thông báo" className="up-action">
          <Bell size={20} />
          {!!notifUnread && notifUnread > 0 && (
            <span style={{ position: "absolute", top: 2, right: 2, background: "var(--danger)", color: "#fff", borderRadius: "50%", fontSize: 9, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, lineHeight: 1, padding: "0 2px" }}>
              {notifUnread > 9 ? "9+" : notifUnread}
            </span>
          )}
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          style={{ display: "inline" }}
        >
          <button type="submit" title="Đăng xuất" className="up-action">
            <LogOut size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
