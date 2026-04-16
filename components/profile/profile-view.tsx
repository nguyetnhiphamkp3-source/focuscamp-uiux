import Link from "next/link";
import {
  avatarColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";
import { EditProfileButton } from "./edit-profile-modal";
import {
  classByKey,
  pillarByKey,
  tierForLevel,
} from "@/lib/community-config";
import type {
  ClassConfig,
  PillarConfig,
  GemsConfig,
  LevelTier,
} from "@/lib/community-config";

type Community = { name: string; slug: string };

type ProfileUser = {
  id: string;
  name: string | null;
  image: string | null;
  handle: string | null;
  bio: string | null;
  location: string | null;
  createdAt: Date;
};

type Membership = {
  role: string;
  tier: string;
  className: string | null;
  xp: number;
  level: number;
  aip: number;
  gems: number;
  streakDays: number;
  joinedAt: Date;
} | null;

type RecentPost = {
  id: string;
  type: string;
  title: string | null;
  body: string;
  pillar: string | null;
  isCot: boolean;
  createdAt: Date;
  commentCount: number;
  reactionCount: number;
};

type OtherCommunity = {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
};

export function ProfileView({
  community,
  user,
  membership,
  recentPosts,
  stats,
  isSelf,
  classes,
  pillars,
  currency,
  levelTiers,
  otherCommunities = [],
  viewingUserId,
}: {
  community: Community;
  user: ProfileUser;
  membership: Membership;
  recentPosts: RecentPost[];
  stats: { posts: number; comments: number };
  isSelf: boolean;
  classes: ClassConfig[];
  pillars: PillarConfig[];
  currency: GemsConfig;
  levelTiers: LevelTier[];
  /** Other communities this user belongs to. Name + icon only (no stats). */
  otherCommunities?: OtherCommunity[];
  /** Profile owner's userId — used to build cross-community profile links. */
  viewingUserId: string;
}) {
  const name = user.name || "Ẩn danh";
  const handle = user.handle || user.name?.toLowerCase().replace(/\s+/g, "") || "user";
  const myClass = classByKey(membership?.className, classes);
  const tier = membership
    ? tierForLevel(membership.level, levelTiers)
    : null;

  return (
    <>
      <header className="view-header">
        <span className="view-title">{isSelf ? "Profile" : `@${handle}`}</span>
        <span className="view-subtitle">
          {isSelf ? "Hồ sơ & thành tựu của bạn" : `Thành viên ${community.name}`}
        </span>
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
              <div
                className="pf-avatar-lg"
                style={{ background: avatarColorFor(user.id) }}
              >
                {initials(name)}
              </div>
            )}
            <div className="pf-identity">
              <div className="pf-name-row">
                <span className="pf-name">{name}</span>
                <span className="pf-handle">@{handle}</span>
              </div>
              <div className="pf-bio">
                {user.bio ||
                  (membership
                    ? `${membership.role} · ${tier?.name ?? membership.tier} của ${community.name}`
                    : `Chưa là thành viên của ${community.name}`)}
              </div>
              {(myClass || membership) && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: 6,
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                  }}
                >
                  {myClass && (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 10,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {myClass.emoji ? `${myClass.emoji} ` : ""}
                      {myClass.label}
                    </span>
                  )}
                  {user.location && <span>📍 {user.location}</span>}
                  {membership && (
                    <span>
                      Tham gia {fmtRelativeTime(membership.joinedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
            {isSelf && (
              <div className="pf-actions">
                <button className="ui-btn ui-btn-secondary ui-btn-sm">
                  Chia sẻ
                </button>
                <EditProfileButton
                  initial={{
                    name: user.name,
                    handle: user.handle,
                    bio: user.bio,
                    location: user.location,
                  }}
                  communitySlug={community.slug}
                />
              </div>
            )}
          </div>

          {membership && (
            <>
              <div className="pf-level-card">
                <div className="pf-level-badge">{membership.level}</div>
                <div className="pf-level-info">
                  <div className="pf-level-row">
                    <span className="pf-level-title">
                      Level {membership.level}
                      {tier ? ` — ${tier.name}` : ` — ${membership.tier}`}
                    </span>
                  </div>
                  <div className="pf-level-bar">
                    <div
                      className="pf-level-fill"
                      style={{ width: `${Math.min(100, membership.xp % 100)}%` }}
                    ></div>
                  </div>
                  <div className="pf-level-hint">
                    {membership.xp} XP · còn {100 - (membership.xp % 100)} XP để
                    lên level tiếp theo
                  </div>
                </div>
              </div>

              <div className="pf-stats-grid">
                <Stat
                  label="⭐ Total XP"
                  value={membership.xp.toLocaleString()}
                  sub="Điểm kinh nghiệm"
                />
                <Stat
                  label={`${currency.currencyIcon} ${currency.currencyName}`}
                  value={membership.aip.toLocaleString()}
                  sub="Đồng điểm chính"
                />
                {currency.gemsName && (
                  <Stat
                    label={`${currency.gemsIcon ?? "💎"} ${currency.gemsName}`}
                    value={membership.gems.toLocaleString()}
                    sub="Đồng điểm phụ"
                  />
                )}
                <Stat
                  label="🔥 Streak"
                  value={membership.streakDays.toString()}
                  sub="ngày liên tục"
                />
                <Stat label="📝 Posts" value={stats.posts.toString()} sub="đã đăng" />
                <Stat
                  label="💬 Comments"
                  value={stats.comments.toString()}
                  sub="đã bình luận"
                />
              </div>
            </>
          )}

          {otherCommunities.length > 0 && (
            <div className="pf-section" style={{ marginTop: 20 }}>
              <h3>
                {isSelf
                  ? `Bạn cũng active ở ${otherCommunities.length} cộng đồng khác`
                  : `Cũng active ở ${otherCommunities.length} cộng đồng khác`}
              </h3>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginBottom: 10,
                }}
              >
                Chỉ hiển thị danh sách cộng đồng — class / level / XP của từng
                cộng đồng là riêng tư và chỉ hiện khi bạn vào cộng đồng đó.
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {otherCommunities.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}/profile/${viewingUserId}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 12px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 999,
                      textDecoration: "none",
                      color: "var(--text-normal)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {c.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.iconUrl}
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: avatarColorFor(c.id),
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {initials(c.name)}
                      </div>
                    )}
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pf-section" style={{ marginTop: 20 }}>
            <h3>Bài viết gần đây</h3>
            {recentPosts.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                  fontStyle: "italic",
                }}
              >
                {isSelf
                  ? "Bạn chưa đăng bài nào trong cộng đồng này."
                  : "Chưa có bài viết."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recentPosts.map((p) => {
                  const pillar = pillarByKey(p.pillar, pillars);
                  const typeTag =
                    p.type === "QUESTION"
                      ? "❓"
                      : p.type === "SIGNAL"
                        ? "⚡"
                        : "📝";
                  return (
                    <Link
                      key={p.id}
                      href={`/c/${community.slug}/p/${p.id}`}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: 12,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 10,
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div style={{ fontSize: 20, flexShrink: 0 }}>{typeTag}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "var(--text-base)",
                            fontWeight: 600,
                            color: "var(--header-primary)",
                            marginBottom: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.title ||
                            p.body.slice(0, 80) +
                              (p.body.length > 80 ? "…" : "")}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                          }}
                        >
                          <span>{fmtRelativeTime(p.createdAt)}</span>
                          {pillar && (
                            <span>
                              · {pillar.emoji ? `${pillar.emoji} ` : ""}
                              {pillar.label}
                            </span>
                          )}
                          {p.isCot && (
                            <span style={{ color: "var(--premium-gold)" }}>
                              · ⭐ CỐT
                            </span>
                          )}
                          <span>· ❤️ {p.reactionCount}</span>
                          <span>· 💬 {p.commentCount}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
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
