import Link from "next/link";
import { notFound } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

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
    include: {
      _count: { select: { memberships: true, challenges: true } },
      channels: { orderBy: { position: "asc" } },
    },
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
    <div className="app-shell">
      {/* SERVER LIST */}
      <nav className="server-list">
        {myCommunities.map((c, i) => (
          <div
            key={c.id}
            className={`server-icon-wrap ${c.slug === slug ? "active" : ""}`}
          >
            <span className="indicator" />
            <Link
              href={`/c/${c.slug}`}
              className="server-icon"
              style={{ background: BRAND_GRADIENTS[i % BRAND_GRADIENTS.length], color: "#fff" }}
              title={c.name}
            >
              {initials(c.name)}
            </Link>
          </div>
        ))}
        <div className="server-separator" />
        <div className="server-icon-wrap">
          <Link href="/discovery" className="server-icon explore" title="Discovery">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* CHANNEL SIDEBAR */}
      <aside className="channel-sidebar">
        <div
          className="cs-banner"
          style={{
            background: BRAND_GRADIENTS[0],
          }}
        >
          <span className="name">{community.name}</span>
        </div>

        <div className="features-menu">
          <div className="features-section-title">Cộng đồng</div>
          <Link
            href={`/c/${slug}`}
            className="feature-item"
          >
            <span className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </span>
            <span className="feature-name">Trang chủ</span>
          </Link>

          {community.channels.length > 0 && (
            <Link
              href={`/c/${slug}/chat/${community.channels[0].slug}`}
              className="feature-item"
            >
              <span className="feature-icon">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
              </span>
              <span className="feature-name">Chat</span>
            </Link>
          )}

          <div className="feature-item disabled">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </span>
            <span className="feature-name">Challenges</span>
          </div>

          <div className="feature-item disabled">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1z" /></svg>
            </span>
            <span className="feature-name">Khóa học</span>
          </div>

          <div className="feature-item disabled">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1z" /></svg>
            </span>
            <span className="feature-name">Marketplace</span>
          </div>

          <div className="feature-item disabled">
            <span className="feature-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C9.24 2 7 4.24 7 7c0 2.85 2.92 7.21 4.5 9.5.24.35.76.35 1 0C14.08 14.21 17 9.85 17 7c0-2.76-2.24-5-5-5zm0 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg>
            </span>
            <span className="feature-name">AI Agent</span>
            <span className="unread-badge" style={{ background: "var(--premium-gold)", color: "#3a2c00" }}>✨</span>
          </div>

          {community.channels.length > 0 && membership && (
            <>
              <div className="features-section-title">Text channels</div>
              <div className="channel-list">
                {community.channels.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/c/${slug}/chat/${ch.slug}`}
                    className="channel-item"
                  >
                    <span style={{ opacity: 0.6 }}>#</span>
                    {ch.name}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* CENTER CONTENT */}
      <div className="center-area">{children}</div>

      {/* RIGHT SIDEBAR */}
      <aside className="right-sidebar">
        <div className="rs-banner" style={{ background: BRAND_GRADIENTS[0] }}>
          {initials(community.name)}
        </div>
        <div className="rs-body">
          <div className="rs-title">{community.name}</div>
          <div className="rs-tagline">
            {community.tagline || "Community trên focus.camp"}
          </div>
          <div className="rs-stats">
            <div>
              <strong>{community._count.memberships}</strong>
              <span>thành viên</span>
            </div>
            <div>
              <strong>{community.onlineCount}</strong>
              <span>online</span>
            </div>
            <div>
              <strong>{community._count.challenges}</strong>
              <span>challenges</span>
            </div>
          </div>

          {!session?.user ? (
            <Link href="/login" className="rs-cta">
              Đăng nhập để tham gia
            </Link>
          ) : membership ? (
            <>
              <div className="rs-section">
                <h3>Your progress</h3>
                <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  <div>
                    Role: <strong style={{ color: "var(--text-heading)" }}>
                      {membership.role}
                    </strong>
                  </div>
                  <div>
                    Tier: <strong style={{ color: "var(--text-heading)" }}>
                      {membership.tier}
                    </strong>
                  </div>
                  <div>
                    XP: <strong style={{ color: "var(--text-heading)" }}>
                      {membership.xp}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="rs-section">
                <button className="rs-cta secondary">Invite People</button>
              </div>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                const s = await auth();
                if (!s?.user?.id) return;
                await prisma.membership.create({
                  data: {
                    userId: s.user.id,
                    communityId: community.id,
                    role: "MEMBER",
                    tier: "EXPLORER",
                  },
                });
                await prisma.community.update({
                  where: { id: community.id },
                  data: { memberCount: { increment: 1 } },
                });
              }}
            >
              <button type="submit" className="rs-cta">
                Tham gia cộng đồng
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* USER PANEL */}
      <div className="user-panel">
        <div className="info">
          <div className="avatar">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={displayName} referrerPolicy="no-referrer" />
            ) : (
              displayName[0]?.toUpperCase()
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="name">{displayName}</div>
            <div className="status">● Online</div>
          </div>
        </div>
        {session?.user ? (
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="logout">
              Đăng xuất
            </button>
          </form>
        ) : (
          <Link href="/login" className="logout">
            Đăng nhập
          </Link>
        )}
      </div>
    </div>
  );
}

