import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!community) notFound();

  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: {
        userId: session.user.id,
        communityId: community.id,
      },
    },
  });
  if (!membership) redirect(`/c/${slug}`);

  const user = session.user;
  const name = user.name || user.email || "User";
  const initial = name[0].toUpperCase();

  return (
    <>
      <header className="view-header">
        <span className="view-title">Profile</span>
        <span className="view-subtitle">Hồ sơ &amp; thành tựu của bạn</span>
      </header>
      <div className="pf-view">
        <div className="pf-banner"></div>
        <div className="pf-inner">
          <div className="pf-header">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={name}
                referrerPolicy="no-referrer"
                className="pf-avatar-lg"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="pf-avatar-lg">
                {initial}
                <div className="pf-status-dot-lg"></div>
              </div>
            )}
            <div className="pf-identity">
              <div className="pf-name-row">
                <span className="pf-name">{name}</span>
                <span className="pf-handle">@{user.email?.split("@")[0] || "user"}</span>
              </div>
              <div className="pf-bio">
                {membership.role} · {membership.tier} · Member of {community.name}
              </div>
            </div>
            <div className="pf-actions">
              <button className="pf-action-btn secondary">Chia sẻ</button>
              <button className="pf-action-btn primary">Edit profile</button>
            </div>
          </div>

          <div className="pf-level-card">
            <div className="pf-level-badge">{Math.floor(membership.xp / 100)}</div>
            <div className="pf-level-info">
              <div className="pf-level-row">
                <span className="pf-level-title">
                  Level {Math.floor(membership.xp / 100)} — {membership.tier}
                </span>
              </div>
              <div className="pf-level-bar">
                <div
                  className="pf-level-fill"
                  style={{ width: `${membership.xp % 100}%` }}
                ></div>
              </div>
              <div className="pf-level-hint">
                {membership.xp} XP · còn {100 - (membership.xp % 100)} XP để lên level tiếp theo
              </div>
            </div>
          </div>

          <div className="pf-stats-grid">
            <Stat label="⭐ Total XP" value={membership.xp.toString()} sub="Điểm kinh nghiệm" />
            <Stat label="💰 AIP" value="0" sub="Aura In Progress" />
            <Stat label="💎 Gems" value="0" sub="Gem hiếm" />
            <Stat label="🔥 Streak" value="0" sub="ngày liên tục" />
            <Stat label="⚔️ Challenges" value="0" sub="đang tham gia" />
            <Stat label="📚 Lessons" value="0" sub="đã học" />
          </div>

          <div className="pf-section">
            <h3>Achievements &amp; Badges</h3>
            <div className="pf-badges">
              <div className="pf-badge">
                <span className="badge-emoji">👋</span> New member
              </div>
              <div className="pf-badge">
                <span className="badge-emoji">🚀</span> Joined focus.camp
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="pf-stat">
      <div className="pf-stat-label">{label}</div>
      <div className="pf-stat-value">{value}</div>
      <div className="pf-stat-sub">{sub}</div>
    </div>
  );
}
