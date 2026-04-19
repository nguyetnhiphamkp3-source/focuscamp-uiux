import {
  avatarColorFor,
  initials,
  fmtRelativeTime,
} from "@/lib/brand";
import { EditProfileButton } from "./edit-profile-modal";
import { FollowButton } from "./follow-button";
import { classByKey, tierForLevel } from "@/lib/community-config";
import type { ClassConfig, LevelTier } from "@/lib/community-config";

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

type OtherCommunity = {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
};

export function ProfileHeader({
  community,
  user,
  membership,
  isSelf,
  classes,
  levelTiers,
  ownedCommunities,
  latestActivityAt,
  viewerId,
  viewerIsFollowing,
  followerCount,
  followingCount,
}: {
  community: Community;
  user: ProfileUser;
  membership: Membership;
  isSelf: boolean;
  classes: ClassConfig[];
  levelTiers: LevelTier[];
  ownedCommunities: OtherCommunity[];
  latestActivityAt: Date | null;
  viewerId: string | null;
  viewerIsFollowing: boolean;
  followerCount: number;
  followingCount: number;
}) {
  const name = user.name || "Ẩn danh";
  const handle =
    user.handle || user.name?.toLowerCase().replace(/\s+/g, "") || "user";
  const myClass = classByKey(membership?.className, classes);
  const tier = membership ? tierForLevel(membership.level, levelTiers) : null;

  return (
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
          {ownedCommunities.length > 0 && (
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 10,
                background: "rgba(240,179,50,0.12)",
                border: "1px solid rgba(240,179,50,0.3)",
                color: "var(--premium-gold)",
                fontWeight: 600,
              }}
              title={ownedCommunities.map((c) => c.name).join(", ")}
            >
              ★ Owner ({ownedCommunities.length})
            </span>
          )}
          {user.location && <span>📍 {user.location}</span>}
          {latestActivityAt ? (
            <span>● Active {fmtRelativeTime(latestActivityAt)}</span>
          ) : (
            <span>● Chưa hoạt động ở {community.name}</span>
          )}
          <span>
            · Tham gia focus.camp {fmtRelativeTime(user.createdAt)}
          </span>
          {membership && (
            <span>
              · Vào {community.name} {fmtRelativeTime(membership.joinedAt)}
            </span>
          )}
          <span>
            ·{" "}
            <strong style={{ color: "var(--header-primary)" }}>
              {followerCount}
            </strong>{" "}
            followers ·{" "}
            <strong style={{ color: "var(--header-primary)" }}>
              {followingCount}
            </strong>{" "}
            following
          </span>
        </div>
      </div>
      {isSelf ? (
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
              image: user.image,
              userId: user.id,
            }}
            communitySlug={community.slug}
          />
        </div>
      ) : viewerId ? (
        <div className="pf-actions">
          <FollowButton
            targetUserId={user.id}
            initialFollowing={viewerIsFollowing}
          />
        </div>
      ) : null}
    </div>
  );
}
