import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CommunityRightSidebar } from "@/components/shell/community-right-sidebar";
import { FeatureLink } from "@/components/shell/nav-link";

export const dynamic = "force-dynamic";

const BRAND_GRADIENTS = [
  "linear-gradient(135deg,#c77a2d,#8a4f1e)",
  "linear-gradient(135deg,#5865F2,#eb459e)",
  "linear-gradient(135deg,#1abc9c,#0d7c62)",
  "linear-gradient(135deg,#9b59b6,#6a3d72)",
  "linear-gradient(135deg,#f39c12,#d35400)",
];

function initials(name: string) {
  const w = name.split(/\s+/).filter(Boolean);
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
  });
  if (!community) notFound();

  let membership = null;
  let myCommunities: { id: string; slug: string; name: string }[] = [];
  if (session?.user?.id) {
    membership = await prisma.membership.findUnique({
      where: {
        userId_communityId: { userId: session.user.id, communityId: community.id },
      },
    });
    const mems = await prisma.membership.findMany({
      where: { userId: session.user.id },
      include: { community: { select: { id: true, slug: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    });
    myCommunities = mems.map((m) => m.community);
  }

  const user = session?.user;
  const displayName = user?.name || user?.email || "Guest";

  return (
    <div className="community-shell">
      {/* LEFT SECTION */}
      <div className="left-section">
        <div className="left-section-top">
          {/* SERVER LIST */}
          <nav className="server-list">
            <div className="server-icon-wrapper">
              <Link href="/" className="server-icon dm-button">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.2A1.01 1.01 0 003.8 21.454l3.032-.892A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              </Link>
            </div>

            <div className="server-separator"></div>

            {myCommunities.map((c, i) => {
              const active = c.slug === slug;
              return (
                <div key={c.id} className="server-icon-wrapper">
                  <div className={`indicator ${active ? "active" : ""}`}></div>
                  <Link
                    href={`/c/${c.slug}`}
                    className={`server-icon server-icon-text ${active ? "active" : ""}`}
                    style={{ background: BRAND_GRADIENTS[i % BRAND_GRADIENTS.length] }}
                    title={c.name}
                  >
                    {initials(c.name)}
                  </Link>
                </div>
              );
            })}

            <div className="server-separator"></div>

            <div className="server-icon-wrapper">
              <div className="server-icon add-server">+</div>
            </div>
            <div className="server-icon-wrapper">
              <Link href="/discovery" className="server-icon explore-server" title="Discovery">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
              </Link>
            </div>
          </nav>

          {/* CHANNEL SIDEBAR */}
          <aside className="channel-sidebar">
            {/* Server Banner */}
            <div className="server-banner">
              <div className="banner-canvas">
                <div className="node" style={{top:"25px",left:"30px"}}></div>
                <div className="node filled" style={{top:"40px",left:"80px"}}></div>
                <div className="node" style={{top:"20px",left:"140px"}}></div>
                <div className="node filled" style={{top:"55px",left:"170px"}}></div>
                <div className="node" style={{top:"35px",left:"200px"}}></div>
                <div className="node filled" style={{top:"70px",left:"120px"}}></div>
                <div className="line" style={{top:"31px",left:"42px",width:"40px",transform:"rotate(12deg)"}}></div>
                <div className="line" style={{top:"46px",left:"92px",width:"50px",transform:"rotate(-18deg)"}}></div>
                <div className="line" style={{top:"26px",left:"152px",width:"24px",transform:"rotate(55deg)"}}></div>
                <div className="line" style={{top:"62px",left:"132px",width:"42px",transform:"rotate(-10deg)"}}></div>

                <div className="server-banner-header">
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span className="server-name-text">{community.name}</span>
                    <Link href={`/c/${slug}/settings`} className="banner-settings-btn" title="Community Settings">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41L9.25 5.35c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                    </Link>
                  </div>
                  <Link href={`/c/${slug}/invite`} className="banner-invite-btn" title="Invite friends">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* Features Module Menu */}
            <div className="features-menu">
              <div className="features-section-title" style={{paddingTop:"16px"}}>Cộng đồng</div>
              <FeatureLink href={`/c/${slug}`} exact>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg></span>
                <span className="feature-name">Chat</span>
                <span className="unread-badge">12</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/feed`} className="feature-item has-unread">
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></span>
                <span className="feature-name">Bảng tin</span>
                <span className="unread-badge new">3</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/cot`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span>
                <span className="feature-name">CỐT</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/signals`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l3-8z"/></svg></span>
                <span className="feature-name">Tín hiệu</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/qa`} className="feature-item has-unread">
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg></span>
                <span className="feature-name">Hỏi đáp</span>
                <span className="unread-badge">1</span>
              </FeatureLink>

              <div className="features-section-title">Học tập</div>
              <FeatureLink href={`/c/${slug}/courses`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg></span>
                <span className="feature-name">Khóa học</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/challenges`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></span>
                <span className="feature-name">Challenge</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/leaderboard`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm2 4h14v4H5V7zm-2 6h18v2H3v-2zm4 4h10v4H7v-4z"/></svg></span>
                <span className="feature-name">Bảng xếp hạng</span>
              </FeatureLink>

              <div className="features-section-title">Khác</div>
              <FeatureLink href={`/c/${slug}/marketplace`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg></span>
                <span className="feature-name">Marketplace</span>
              </FeatureLink>
              <FeatureLink href="/discovery">
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg></span>
                <span className="feature-name">Discovery</span>
                <span className="unread-badge new">NEW</span>
              </FeatureLink>
              <FeatureLink href={`/c/${slug}/agent`}>
                <span className="feature-icon"><svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7c0 2.85 2.92 7.21 4.5 9.5.24.35.76.35 1 0C14.08 14.21 17 9.85 17 7c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 9.15L6 15l-1.45 1.45C2.85 17.15 1 18.4 1 20.5 1 21.88 2.12 23 3.5 23h17c1.38 0 2.5-1.12 2.5-2.5 0-2.1-1.85-3.35-3.55-4.05L18 15l-6 3.15z"/></svg></span>
                <span className="feature-name">AI Agent</span>
                <span className="unread-badge" style={{background:"var(--premium-gold)"}}>✨</span>
              </FeatureLink>
            </div>
          </aside>
        </div>{/* end left-section-top */}

        {/* User Panel */}
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
                <div className="user-panel-avatar-img">{displayName[0]?.toUpperCase()}</div>
              )}
              <div className="status-dot"></div>
            </div>
            <div className="user-panel-info">
              <div className="user-panel-name">{displayName}</div>
              <div className="user-panel-status-text">
                <span className="in-voice-dot"></span>
                {membership ? `Member · ${membership.tier}` : "Online"}
              </div>
            </div>
          </div>
          <div className="user-panel-actions">
            <div className="mute-btn-group">
              <button className="mute-btn-red" title="Mute">
                <svg viewBox="0 0 24 24"><path d="M19 11c0 1.19-.34 2.3-.9 3.28l-1.23-1.23c.27-.62.44-1.32.44-2.05H19zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>
              </button>
              <button className="mute-dropdown" title="Options">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
            </div>
            <button title="Deafen">
              <svg viewBox="0 0 24 24"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/></svg>
            </button>
            {session?.user ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
                style={{ display: "inline" }}
              >
                <button type="submit" title="Đăng xuất">
                  <svg viewBox="0 0 24 24"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                </button>
              </form>
            ) : (
              <Link href="/login" title="Đăng nhập">
                <svg viewBox="0 0 24 24"><path d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14z"/></svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main className="main-content">{children}</main>

      {/* RIGHT SIDEBAR */}
      <CommunityRightSidebar
        community={{
          id: community.id,
          slug: community.slug,
          name: community.name,
          tagline: community.tagline,
          description: community.description,
          memberCount: community.memberCount,
          onlineCount: community.onlineCount,
        }}
        membership={
          membership
            ? {
                role: membership.role,
                tier: membership.tier,
                xp: membership.xp,
              }
            : null
        }
        isLoggedIn={!!session?.user}
      />
    </div>
  );
}
