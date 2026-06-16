import { FeatureLink } from "./nav-link";
import { NotifBadge } from "./notif-badge";
import {
  GlobeAltIcon as Globe,
  MagnifyingGlassIcon as Search,
  ShoppingCartIcon as ShoppingCart,
  QuestionMarkCircleIcon as HelpCircle,
  FireIcon as Flame,
  ShieldCheckIcon as Shield,
  DocumentTextIcon as FileText,
  UserIcon as User,
  CurrencyDollarIcon as DollarSign,
  BellIcon as Bell,
  Cog6ToothIcon as Settings,
} from "@heroicons/react/24/solid";
import { getLocale, tSync } from "@/lib/locale-server";

export async function HomeSidebar({
  notifUnread = 0,
  profileHref = "/settings",
  isSuperAdmin = false,
}: {
  notifUnread?: number;
  profileHref?: string;
  isSuperAdmin?: boolean;
}) {
  const locale = await getLocale();
  const T = (key: Parameters<typeof tSync>[0]) => tSync(key, locale);

  return (
    <aside className="channel-sidebar home-sidebar">
      {/* Menu — Telegram-style grouped cards */}
      <div className="features-menu">
        <div className="features-section-title" style={{ paddingTop: 16 }}>
          {T("sectionDiscover")}
        </div>
        <div className="sidebar-group">
          <FeatureLink href="/discovery">
            <span className="feature-icon" style={{ background: "#3390ec" }}><Globe style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navDiscovery")}</span>
            <span className="unread-badge new">NEW</span>
          </FeatureLink>
          <FeatureLink href="/search">
            <span className="feature-icon" style={{ background: "#8e8e93" }}><Search style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navSearch")}</span>
          </FeatureLink>
          <FeatureLink href="/marketplace">
            <span className="feature-icon" style={{ background: "#f5a623" }}><ShoppingCart style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navSuperMarketplace")}</span>
          </FeatureLink>
        </div>

        <div className="features-section-title">{T("sectionAbout")}</div>
        <div className="sidebar-group">
          <FeatureLink href="/about">
            <span className="feature-icon" style={{ background: "#34aadc" }}><HelpCircle style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navManifesto")}</span>
          </FeatureLink>
          <FeatureLink href="/direct-challenge">
            <span className="feature-icon" style={{ background: "#ff6b3d" }}><Flame style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navDirectChallenge")}</span>
          </FeatureLink>
          <FeatureLink href="/brand">
            <span className="feature-icon" style={{ background: "#5e5ce6" }}><Shield style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navBrandGuide")}</span>
          </FeatureLink>
          <FeatureLink href="/fire-keeper">
            <span className="feature-icon" style={{ background: "#ff3b30" }}><Flame style={{ width: 18, height: 18 }} /></span>
            <span className="feature-name">{T("navFireKeeper")}</span>
          </FeatureLink>
        </div>

        {isSuperAdmin && (
          <>
            <div className="features-section-title">{T("sectionAdmin")}</div>
            <div className="sidebar-group">
              <FeatureLink href="/admin/orders">
                <span className="feature-icon" style={{ background: "#30b0c7" }}><FileText style={{ width: 18, height: 18 }} /></span>
                <span className="feature-name">{T("navPlatformOrders")}</span>
              </FeatureLink>
            </div>
          </>
        )}

      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "12px 14px",
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

      {/* Bottom tab bar */}
      <div className="sidebar-tabbar">
        <FeatureLink href={profileHref} exact className="tab-item" prefetch>
          <User style={{ width: 22, height: 22 }} />
        </FeatureLink>
        {profileHref.startsWith("/u/") && (
          <FeatureLink href={`${profileHref}/affiliates`} className="tab-item">
            <DollarSign style={{ width: 22, height: 22 }} />
          </FeatureLink>
        )}
        <FeatureLink href="/inbox" className="tab-item">
          <Bell style={{ width: 22, height: 22 }} />
          <NotifBadge initial={notifUnread} />
        </FeatureLink>
        <FeatureLink href="/settings" className="tab-item">
          <Settings style={{ width: 22, height: 22 }} />
        </FeatureLink>
      </div>
    </aside>
  );
}
