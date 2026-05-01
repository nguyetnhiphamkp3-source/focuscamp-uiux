import type {
  ClassConfig,
  PillarConfig,
  GemsConfig,
  LevelTier,
} from "@/lib/community-config";
import type { HeatmapDay } from "@/lib/services/profile";
import { ProfileHeader } from "./profile-header";
import { ProfileLevelCard } from "./profile-stats";
import { ProfileOverviewCard } from "./profile-overview-card";
import { ProfileCommunityList } from "./profile-community-list";
import { ProfileRecentPosts } from "./profile-recent-posts";
import { toSlug } from "@/lib/brand";

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

type XpEntry = {
  id: string;
  amount: number;
  reason: string;
  reasonId: string | null;
  createdAt: Date;
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
  ownedCommunities = [],
  latestActivityAt = null,
  heatmap = [],
  recentXp = [],
  viewingUserId,
  viewerId = null,
  viewerIsFollowing = false,
  followerCount = 0,
  followingCount = 0,
}: {
  community: Community;
  user: ProfileUser;
  membership: Membership;
  recentPosts: RecentPost[];
  stats: {
    posts: number;
    comments: number;
    checkins: number;
    contributions: number;
    activeDays: number;
    currentStreak: number;
    longestStreak: number;
    peakHour: number | null;
  };
  isSelf: boolean;
  classes: ClassConfig[];
  pillars: PillarConfig[];
  currency: GemsConfig;
  levelTiers: LevelTier[];
  /** Other communities this user belongs to. Name + icon only (no stats). */
  otherCommunities?: OtherCommunity[];
  /** Communities this user owns — badge signal. */
  ownedCommunities?: OtherCommunity[];
  /** Most recent activity timestamp in this community (null if no activity). */
  latestActivityAt?: Date | null;
  /** Per-day activity counts for the past 365 days. */
  heatmap?: HeatmapDay[];
  /** Last 12 XP events, newest first. */
  recentXp?: XpEntry[];
  /** Profile owner's userId — used to build cross-community profile links. */
  viewingUserId: string;
  /** Current viewer — for Follow button gating. */
  viewerId?: string | null;
  viewerIsFollowing?: boolean;
  followerCount?: number;
  followingCount?: number;
}) {
  const handle = user.handle || (user.name ? toSlug(user.name) : "user");

  return (
    <>
      <header className="view-header">
        <span className="view-title">{isSelf ? "Profile" : `@${handle}`}</span>
        <span className="view-subtitle">
          {isSelf ? "Hồ sơ & thành tựu của bạn" : `Thành viên ${community.name}`}
        </span>
      </header>
      <div className="pf-view">
        <div className="pf-inner">
          <ProfileHeader
            community={community}
            user={user}
            membership={membership}
            isSelf={isSelf}
            classes={classes}
            levelTiers={levelTiers}
            ownedCommunities={ownedCommunities}
            latestActivityAt={latestActivityAt}
            viewerId={viewerId}
            viewerIsFollowing={viewerIsFollowing}
            followerCount={followerCount}
            followingCount={followingCount}
          />

          {membership && (
            <>
              <ProfileLevelCard
                membership={membership}
                levelTiers={levelTiers}
              />
              <ProfileOverviewCard
                membership={membership}
                stats={stats}
                levelTiers={levelTiers}
                heatmap={heatmap}
                recentXp={recentXp}
              />
            </>
          )}

          <ProfileCommunityList
            otherCommunities={otherCommunities}
            viewingUserId={viewingUserId}
            isSelf={isSelf}
          />

          <ProfileRecentPosts
            recentPosts={recentPosts}
            communitySlug={community.slug}
            pillars={pillars}
            isSelf={isSelf}
          />
        </div>
      </div>
    </>
  );
}
