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
import { BossChallengeCard } from "@/components/community/boss-challenge-card";
import { FeatureUnreadBadge } from "@/components/community/feature-unread-badge";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { unreadCount } from "@/lib/services/notification";
import {
  getUiConfig,
  isFeatureVisible,
  type FeatureKey,
} from "@/lib/community-config";
import { getPlanStatus } from "@/lib/platform-plans";
import { PlanStatusBanner } from "@/components/community/plan-status-banner";

export const PREVIEW_MEMBER_COOKIE = "fc_preview_member";

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
  let myCommunities: { id: string; slug: string; name: string; iconUrl: string | null }[] = [];
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
          include: { community: { select: { id: true, slug: true, name: true, iconUrl: true } } },
          orderBy: { joinedAt: "asc" },
        })
        .then((mems) => {
          myCommunities = mems.map((m) => m.community);
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
  const cookieStore = await cookies();
  const previewAsMember =
    isOwner && cookieStore.get(PREVIEW_MEMBER_COOKIE)?.value === "1";
  const planState = getPlanStatus(community);

  const visible = (k: FeatureKey) =>
    isFeatureVisible(ui, k, isOwner, previewAsMember);
  const anyVisible = (...keys: FeatureKey[]) => keys.some(visible);
  const showFeatureBadges = !!membership && !!session?.user?.id;

  return (
    <div className="community-shell">
      {/* LEFT SECTION */}
      <div className="left-section">
        <div className="left-section-top">
          <ServerList communities={myCommunities} activeSlug={slug} />

          {/* CHANNEL SIDEBAR */}
          <aside className="channel-sidebar">
            <CommunityHeader
              slug={slug}
              name={community.name}
              isOwner={isOwner}
              isMember={!!membership}
              previewAsMember={previewAsMember}
            />

            {/* Boss + Challenge combined card */}
            <BossChallengeCard
              userId={session?.user?.id ?? null}
              communityId={community.id}
              communitySlug={slug}
            />

            {/* Features Module Menu */}
            <div className="features-menu">
              {anyVisible("chat", "feed", "cot", "signals", "qa") && (
                <div className="features-section-title" style={{ paddingTop: "16px" }}>
                  Cộng đồng
                </div>
              )}
              {visible("chat") && (
                <FeatureLink href={`/c/${slug}`} exact>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg></span>
                  <span className="feature-name">Chat</span>
                </FeatureLink>
              )}
              {visible("feed") && (
                <FeatureLink href={`/c/${slug}/feed`}>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></span>
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
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
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
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l3-8z"/></svg></span>
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
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg></span>
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
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg></span>
                  <span className="feature-name">Khóa học</span>
                </FeatureLink>
              )}
              {visible("challenges") && (
                <FeatureLink href={`/c/${slug}/challenges`}>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
                  <span className="feature-name">Challenge</span>
                </FeatureLink>
              )}
              {visible("events") && (
                <FeatureLink href={`/c/${slug}/events`}>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg></span>
                  <span className="feature-name">Events</span>
                </FeatureLink>
              )}
              {visible("leaderboard") && (
                <FeatureLink href={`/c/${slug}/leaderboard`}>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm2 4h14v4H5V7zm-2 6h18v2H3v-2zm4 4h10v4H7v-4z"/></svg></span>
                  <span className="feature-name">Bảng xếp hạng</span>
                </FeatureLink>
              )}

              {anyVisible("marketplace", "agent") && (
                <div className="features-section-title">Khác</div>
              )}
              {visible("marketplace") && (
                <FeatureLink href={`/c/${slug}/marketplace`}>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg></span>
                  <span className="feature-name">Marketplace</span>
                </FeatureLink>
              )}
              {visible("agent") && (
                <FeatureLink href={`/c/${slug}/agent`}>
                  <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7c0 2.85 2.92 7.21 4.5 9.5.24.35.76.35 1 0C14.08 14.21 17 9.85 17 7c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 9.15L6 15l-1.45 1.45C2.85 17.15 1 18.4 1 20.5 1 21.88 2.12 23 3.5 23h17c1.38 0 2.5-1.12 2.5-2.5 0-2.1-1.85-3.35-3.55-4.05L18 15l-6 3.15z"/></svg></span>
                  <span className="feature-name">AI Agent</span>
                </FeatureLink>
              )}
              {isOwner && (
                <>
                  <div className="features-section-title">Quản lý</div>
                  <FeatureLink href={`/c/${slug}/orders`}>
                    <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></span>
                    <span className="feature-name">Đơn hàng</span>
                  </FeatureLink>
                </>
              )}
            </div>
          </aside>
        </div>{/* end left-section-top */}

        {/* User Panel */}
        <UserPanel
          user={user}
          subtitle={membership ? `Member · ${membership.tier}` : "Online"}
          profileHref={`/c/${slug}/profile`}
        />
      </div>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <PlanStatusBanner
          state={planState}
          isOwner={isOwner}
          communityId={community.id}
        />
        {children}
      </main>

      {/* RIGHT SIDEBAR (parallel route slot) */}
      {rightSidebar}
      <KeyboardShortcuts />
      <ShortcutSheet />
      <MobileBottomNav
        notifUnread={notifUnread}
        profileHref={`/c/${slug}/profile`}
      />
    </div>
  );
}
