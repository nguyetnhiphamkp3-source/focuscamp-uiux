import { signOut } from "@/auth";
import { LoginModal } from "./login-modal";

export function UserPanel({
  user,
  subtitle,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null } | null | undefined;
  subtitle?: string;
}) {
  const displayName = user?.name || user?.email || "Guest";

  return (
    <div className="user-panel">
      <div className="user-panel-left" title="Mở profile">
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
            <span className="in-voice-dot"></span>
            {subtitle || (user ? "Online" : "Guest")}
          </div>
        </div>
      </div>
      <div className="user-panel-actions">
        <div className="mute-btn-group">
          <button className="mute-btn-red" title="Mute">
            <svg viewBox="0 0 24 24">
              <path d="M19 11c0 1.19-.34 2.3-.9 3.28l-1.23-1.23c.27-.62.44-1.32.44-2.05H19zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          </button>
          <button className="mute-dropdown" title="Options">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
        </div>
        <button title="Deafen">
          <svg viewBox="0 0 24 24">
            <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z" />
          </svg>
        </button>
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
