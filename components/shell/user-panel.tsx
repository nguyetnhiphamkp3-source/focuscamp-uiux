import Link from "next/link";
import { LoginModal } from "./login-modal";
import { UserMenu } from "./user-menu";
import { NotifBell } from "./notif-bell";
import { CartIcon } from "@/components/marketplace/cart-icon";
import { LogIn } from "lucide-react";
import { getLocale, tSync } from "@/lib/locale-server";

export async function UserPanel({
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
  const locale = await getLocale();
  const T = (key: Parameters<typeof tSync>[0]) => tSync(key, locale);
  const displayName = user?.name || user?.email || T("guest");

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
          {subtitle || (user ? "Online" : T("guest"))}
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
              {T("loginCta")}
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
        <UserMenu user={user} chatHref={chatHref} />
        <CartIcon compact />
        <NotifBell initial={notifUnread ?? 0} />
      </div>
    </div>
  );
}
