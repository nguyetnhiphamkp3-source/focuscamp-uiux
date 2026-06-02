import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FeatureLink } from "@/components/shell/nav-link";
import { ServerList } from "@/components/shell/server-list";
import { UserPanel } from "@/components/shell/user-panel";
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts";
import { ShortcutSheet } from "@/components/shell/shortcut-sheet";
import { CommunityHeader } from "@/components/shell/community-header";
import { FeatureUnreadBadge } from "@/components/community/feature-unread-badge";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { PresenceHeartbeat } from "@/components/shell/presence-heartbeat";
import { unreadCount } from "@/lib/services/notification";
import {
  getUiConfig,
  isFeatureVisible,
  type FeatureKey,
} from "@/lib/community-config";
import { getTiersConfig } from "@/lib/services/subscription";
import { getPlanStatus } from "@/lib/platform-plans";
import { PlanStatusBanner } from "@/components/community/plan-status-banner";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";
import {
  MessageSquare, Trophy, Zap, HelpCircle, BookOpen, Star,
  Calendar, BarChart2, ShoppingCart, MapPin, Flag, FileText,
  Users, Bot,
} from "lucide-react";

import { PREVIEW_MEMBER_COOKIE } from "@/lib/preview-mode";

export const dynamic = "force-dynamic";

export default async function CommunityLayout({
  children,
  rightSidebar,
  params,
}: {
  children: React.ReactNode;
  rightSidebar: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
  });
  if (!community) notFound();

  let membership = null;
  let myCommunities: { id: string; slug: string; name: string; iconUrl: string | null; isOwner: boolean }[] = [];
  let freshUser: { id: string; name: string | null; email: string | null; image: string | null } | null = null;
  let notifUnread = 0;
  if (session?.user?.id) {
    [membership, , freshUser, notifUnread] = await Promise.all([
      prisma.membership.findUnique({
        where: {
          userId_communityId: { userId: session.user.id, communityId: community.id },
        },
      }),
      prisma.membership
        .findMany({
          where: { userId: session.user.id },
          include: { community: { select: { id: true, slug: true, name: true, iconUrl: true, ownerId: true } } },
          orderBy: { joinedAt: "asc" },
        })
        .then((mems) => {
          myCommunities = mems.map((m) => ({
            ...m.community,
            isOwner: m.community.ownerId === session.user!.id,
          }));
        }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true, image: true },
      }),
      unreadCount(session.user.id),
    ]);
  }

  const user = freshUser ?? session?.user;

  const ui = getUiConfig(community);
  const isOwner = community.ownerId === session?.user?.id;
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: membership?.role,
  });
  const permissions = communityPermissionFlags(role);
  const cookieStore = await cookies();
  const previewAsMember =
    isOwner && cookieStore.get(PREVIEW_MEMBER_COOKIE)?.value === "1";
  const planState = getPlanStatus(community);
  const isNonMember = !membership && !isOwner;

  const visible = (k: FeatureKey) =>
    isFeatureVisible(ui, k, isOwner, previewAsMember);
  const anyVisible = (...keys: FeatureKey[]) => keys.some(visible);
  const showFeatureBadges = !!membership && !!session?.user?.id;
  const showAgentFeature =
    visible("agent") && permissions.canManageAiAgent && !previewAsMember;
  const hasPaidTiers = getTiersConfig(community.tiersConfig).some((t) => !t.isFree);
  const showUpgradeLink = !!membership && !isOwner && !previewAsMember && hasPaidTiers;
  const panelRole = role === "MEMBER" ? "Member" : role;
  const panelSubtitle =
    user && (membership || isOwner)
      ? membership?.tier
        ? `${panelRole} · ${membership.tier}`
        : panelRole
      : user
        ? "Online"
        : "Cần đăng nhập";

  return (
    <div className="community-shell">
      {/* LEFT SECTION */}
      <div className="left-section">
        <div className="left-section-top">
          <ServerList communities={myCommunities} activeSlug={slug} />

          {/* CHANNEL SIDEBAR — always visible; features locked for non-members */}
          <aside className="channel-sidebar">
            <CommunityHeader
              slug={slug}
              name={community.name}
              iconUrl={community.iconUrl}
              isOwner={isOwner}
              isMember={!!membership}
              canAccessSettings={isOwner || role === "ADMIN"}
              previewAsMember={previewAsMember}
            />

            {/* Features Module Menu — grayed + locked for non-members */}
            <div
              className="features-menu"
              style={isNonMember ? { opacity: 0.42, pointerEvents: "none", userSelect: "none" } : {}}
            >
              {isNonMember && (
                <div style={{
                  margin: "var(--space-3) var(--space-2) var(--space-1)",
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-md)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--fw-bold)",
                  color: "var(--text-heading)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  🔒 Tham gia để mở khoá
                </div>
              )}
              {anyVisible("feed", "cot", "signals", "qa") && (
                <div className="features-section-title" style={{ paddingTop: "16px" }}>
                  Cộng đồng
                </div>
              )}
              {visible("feed") && (
                <FeatureLink href={`/c/${slug}/feed`}>
                  <span className="feature-icon"><MessageSquare size={18} /></span>
                  <span className="feature-name">Bảng tin</span>
                  {showFeatureBadges && (
                    <FeatureUnreadBadge
                      communityId={community.id}
                      featureKey="feed"
                      href={`/c/${slug}/feed`}
                    />
                  )}
                </FeatureLink>
              )}
              {visible("cot") && (
                <FeatureLink href={`/c/${slug}/cot`}>
                  <span className="feature-icon"><Trophy size={18} /></span>
                  <span className="feature-name">CỐT</span>
                  {showFeatureBadges && (
                    <FeatureUnreadBadge
                      communityId={community.id}
                      featureKey="cot"
                      href={`/c/${slug}/cot`}
                    />
                  )}
                </FeatureLink>
              )}
              {visible("signals") && (
                <FeatureLink href={`/c/${slug}/signals`}>
                  <span className="feature-icon"><Zap size={18} /></span>
                  <span className="feature-name">Tín hiệu</span>
                  {showFeatureBadges && (
                    <FeatureUnreadBadge
                      communityId={community.id}
                      featureKey="signals"
                      href={`/c/${slug}/signals`}
                    />
                  )}
                </FeatureLink>
              )}
              {visible("qa") && (
                <FeatureLink href={`/c/${slug}/qa`}>
                  <span className="feature-icon"><HelpCircle size={18} /></span>
                  <span className="feature-name">Hỏi đáp</span>
                  {showFeatureBadges && (
                    <FeatureUnreadBadge
                      communityId={community.id}
                      featureKey="qa"
                      href={`/c/${slug}/qa`}
                    />
                  )}
                </FeatureLink>
              )}

              {anyVisible("courses", "challenges", "events", "leaderboard") && (
                <div className="features-section-title">Học tập</div>
              )}
              {visible("courses") && (
                <FeatureLink href={`/c/${slug}/courses`}>
                  <span className="feature-icon"><BookOpen size={18} /></span>
                  <span className="feature-name">Khóa học</span>
                </FeatureLink>
              )}
              {visible("challenges") && (
                <FeatureLink href={`/c/${slug}/challenges`}>
                  <span className="feature-icon"><Star size={18} /></span>
                  <span className="feature-name">Challenge</span>
                </FeatureLink>
              )}
              {visible("events") && (
                <FeatureLink href={`/c/${slug}/events`}>
                  <span className="feature-icon"><Calendar size={18} /></span>
                  <span className="feature-name">Events</span>
                </FeatureLink>
              )}
              {visible("leaderboard") && (
                <FeatureLink href={`/c/${slug}/leaderboard`}>
                  <span className="feature-icon"><BarChart2 size={18} /></span>
                  <span className="feature-name">Bảng xếp hạng</span>
                </FeatureLink>
              )}

              {(visible("marketplace") || showAgentFeature) && (
                <div className="features-section-title">Khác</div>
              )}
              {visible("marketplace") && (
                <FeatureLink href={`/c/${slug}/marketplace`}>
                  <span className="feature-icon"><ShoppingCart size={18} /></span>
                  <span className="feature-name">Marketplace</span>
                </FeatureLink>
              )}
              {showAgentFeature && (
                <FeatureLink href={`/c/${slug}/agent`}>
                  <span className="feature-icon"><Bot size={18} /></span>
                  <span className="feature-name">AI Agent</span>
                </FeatureLink>
              )}
              {(permissions.canManageOrders || permissions.canModerateContent) && !previewAsMember && (
                <>
                  <div className="features-section-title">Quản lý</div>
                  {permissions.canModerateContent && (
                    <FeatureLink href={`/c/${slug}/reports`}>
                      <span className="feature-icon"><Flag size={18} /></span>
                      <span className="feature-name">Báo cáo</span>
                    </FeatureLink>
                  )}
                  {permissions.canManageOrders && (
                    <FeatureLink href={`/c/${slug}/orders`}>
                      <span className="feature-icon"><FileText size={18} /></span>
                      <span className="feature-name">Đơn hàng</span>
                    </FeatureLink>
                  )}
                  {permissions.canManageOrders && (
                    <FeatureLink href={`/c/${slug}/affiliate`}>
                      <span className="feature-icon"><Users size={18} /></span>
                      <span className="feature-name">Affiliate</span>
                    </FeatureLink>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>{/* end left-section-top */}

        {/* User Panel */}
        <UserPanel
          user={user}
          subtitle={panelSubtitle}
          profileHref={`/c/${slug}/profile`}
          notifUnread={notifUnread}
          chatHref={visible("chat") ? `/c/${slug}` : undefined}
        />
      </div>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <PlanStatusBanner
          state={planState}
          isOwner={isOwner}
          communityId={community.id}
        />
        {!isOwner && (planState.status === "pending" || planState.status === "expired") ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-4)",
              padding: "var(--space-10)",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: 48 }}>🔒</span>
            <h2 style={{ fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--header-primary)", margin: 0 }}>
              Cộng đồng này chưa sẵn sàng
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0, maxWidth: 360 }}>
              Cộng đồng đang trong quá trình thiết lập. Hãy khám phá các cộng đồng khác đang hoạt động.
            </p>
            <a
              href="/discovery"
              style={{
                marginTop: "var(--space-2)",
                padding: "10px 20px",
                background: "var(--brand-green)",
                color: "#fff",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
              }}
            >
              Khám phá cộng đồng khác
            </a>
          </div>
        ) : (
          children
        )}
      </main>

      {/* RIGHT SIDEBAR (parallel route slot) */}
      {rightSidebar}
      <KeyboardShortcuts />
      <ShortcutSheet />
      {session && <PresenceHeartbeat communityId={community.id} />}
      <MobileBottomNav
        notifUnread={notifUnread}
        profileHref={`/c/${slug}/profile`}
      />
    </div>
  );
}
