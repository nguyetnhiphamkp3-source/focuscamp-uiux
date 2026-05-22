import { FeatureLink } from "./nav-link";
import { NotifBadge } from "./notif-badge";

export function HomeSidebar({
  notifUnread = 0,
  profileHref = "/settings",
  isSuperAdmin = false,
}: {
  notifUnread?: number;
  profileHref?: string;
  isSuperAdmin?: boolean;
}) {
  return (
    <aside className="channel-sidebar">
      {/* Menu */}
      <div className="features-menu">
        <div className="features-section-title" style={{ paddingTop: 16 }}>
          Khám phá
        </div>
        <FeatureLink href="/discovery">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </span>
          <span className="feature-name">Discovery</span>
          <span className="unread-badge new">NEW</span>
        </FeatureLink>
        <FeatureLink href="/search">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
          </span>
          <span className="feature-name">Tìm kiếm</span>
        </FeatureLink>
        <FeatureLink href="/marketplace">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </span>
          <span className="feature-name">Marketplace</span>
        </FeatureLink>

        <div className="features-section-title">Về chúng tôi</div>
        <FeatureLink href="/about">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
            </svg>
          </span>
          <span className="feature-name">Manifesto</span>
        </FeatureLink>
        <FeatureLink href="/direct-challenge">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              {/* Flame icon — matches the 'chọn lửa' motif */}
              <path d="M12 2C10 6 6 9 6 14c0 3.3 2.7 6 6 6s6-2.7 6-6c0-1.7-.6-3.2-1.6-4.4C15 11.5 13 12 12 12c0-3 1-7 0-10z" />
            </svg>
          </span>
          <span className="feature-name">Direct Challenge</span>
        </FeatureLink>
        <FeatureLink href="/brand">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l-8 4v6c0 5 3.5 9.7 8 11 4.5-1.3 8-6 8-11V7l-8-4z" />
            </svg>
          </span>
          <span className="feature-name">Brand Guide</span>
        </FeatureLink>

        {isSuperAdmin && (
          <>
            <div className="features-section-title">Admin</div>
            <FeatureLink href="/admin/orders">
              <span className="feature-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </span>
              <span className="feature-name">Platform Orders</span>
            </FeatureLink>
          </>
        )}

        <div className="features-section-title">Tài khoản</div>
        <FeatureLink href={profileHref}>
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </span>
          <span className="feature-name">Profile</span>
        </FeatureLink>
        <FeatureLink href="/inbox">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </span>
          <span className="feature-name">Thông báo</span>
          <NotifBadge initial={notifUnread} />
        </FeatureLink>
        <FeatureLink href="/settings">
          <span className="feature-icon">
            <svg viewBox="0 0 24 24">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
            </svg>
          </span>
          <span className="feature-name">Cài đặt</span>
        </FeatureLink>
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "12px 14px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          rowGap: 4,
        }}
      >
        <a href="/pricing" className="legal-link">Pricing</a>
        <span>·</span>
        <a href="/docs/mcp" className="legal-link">MCP API</a>
        <span>·</span>
        <a href="/terms" className="legal-link">Điều khoản</a>
        <span>·</span>
        <a href="/privacy" className="legal-link">Bảo mật</a>
        <span>·</span>
        <a href="/refund" className="legal-link">Hoàn tiền</a>
      </div>
    </aside>
  );
}
