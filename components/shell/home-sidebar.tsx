import { FeatureLink } from "./nav-link";
import { NotifBadge } from "./notif-badge";
import {
  Globe, Search, ShoppingCart, HelpCircle, Flame, Shield,
  FileText, User, DollarSign, Bell, Settings,
} from "lucide-react";

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
          <span className="feature-icon"><Globe size={18} /></span>
          <span className="feature-name">Discovery</span>
          <span className="unread-badge new">NEW</span>
        </FeatureLink>
        <FeatureLink href="/search">
          <span className="feature-icon"><Search size={18} /></span>
          <span className="feature-name">Tìm kiếm</span>
        </FeatureLink>
        <FeatureLink href="/marketplace">
          <span className="feature-icon"><ShoppingCart size={18} /></span>
          <span className="feature-name">Super Marketplace</span>
        </FeatureLink>

        <div className="features-section-title">Về chúng tôi</div>
        <FeatureLink href="/about">
          <span className="feature-icon"><HelpCircle size={18} /></span>
          <span className="feature-name">Manifesto</span>
        </FeatureLink>
        <FeatureLink href="/direct-challenge">
          <span className="feature-icon"><Flame size={18} /></span>
          <span className="feature-name">Direct Challenge</span>
        </FeatureLink>
        <FeatureLink href="/brand">
          <span className="feature-icon"><Shield size={18} /></span>
          <span className="feature-name">Brand Guide</span>
        </FeatureLink>

        {isSuperAdmin && (
          <>
            <div className="features-section-title">Admin</div>
            <FeatureLink href="/admin/orders">
              <span className="feature-icon"><FileText size={18} /></span>
              <span className="feature-name">Platform Orders</span>
            </FeatureLink>
          </>
        )}

        <div className="features-section-title">Tài khoản</div>
        <FeatureLink href={profileHref} exact>
          <span className="feature-icon"><User size={18} /></span>
          <span className="feature-name">Profile</span>
        </FeatureLink>
        {profileHref.startsWith("/u/") && (
          <FeatureLink href={`${profileHref}/affiliates`}>
            <span className="feature-icon"><DollarSign size={18} /></span>
            <span className="feature-name">Hoa Hồng</span>
          </FeatureLink>
        )}
        <FeatureLink href="/inbox">
          <span className="feature-icon"><Bell size={18} /></span>
          <span className="feature-name">Thông báo</span>
          <NotifBadge initial={notifUnread} />
        </FeatureLink>
        <FeatureLink href="/settings">
          <span className="feature-icon"><Settings size={18} /></span>
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
