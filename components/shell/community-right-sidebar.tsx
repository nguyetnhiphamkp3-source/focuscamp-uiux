import { JoinButton } from "./join-button";
import { CommunitySearchBar } from "./community-search-bar";
import { InviteCopyButton } from "./invite-copy-button";
import { UpgradeBannerButton } from "./upgrade-banner-button";
import { classByKey } from "@/lib/community-config";
import type { ClassConfig } from "@/lib/community-config";
import type { TierConfigItem } from "@/lib/services/subscription";
import { getLocale, tSync } from "@/lib/locale-server";
import { DICT } from "@/lib/locale";

type Community = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  bannerUrl: string | null;
  iconUrl: string | null;
  memberCount: number;
  onlineCount: number;
};

type Membership = {
  role: string;
  tier: string;
  xp: number;
  className: string | null;
} | null;

export async function CommunityRightSidebar({
  community,
  membership,
  classes,
  tiers = [],
}: {
  community: Community;
  membership: Membership;
  isLoggedIn: boolean;
  classes: ClassConfig[];
  tiers?: TierConfigItem[];
}) {
  const hasPaidTiers = tiers.some((t) => !t.isFree);
  const locale = await getLocale();
  const T = (key: Parameters<typeof tSync>[0]) => tSync(key, locale);

  return (
    <aside className="right-sidebar" id="rightSidebar">
      {membership ? (
        <MemberView community={community} membership={membership} classes={classes} hasPaidTiers={hasPaidTiers} tiers={tiers} T={T} locale={locale} />
      ) : (
        <GuestView community={community} classes={classes} tiers={tiers} T={T} locale={locale} />
      )}
    </aside>
  );
}

function GuestView({
  community,
  classes,
  tiers,
  T,
  locale,
}: {
  community: Community;
  classes: ClassConfig[];
  tiers: TierConfigItem[];
  T: (key: Parameters<typeof tSync>[0]) => string;
  locale: import("@/lib/locale").Locale;
}) {
  return (
    <div className="rs-view active">
      <div
        className="rs-banner"
        style={{
          background: community.bannerUrl
            ? "transparent"
            : "linear-gradient(135deg,#c77a2d,#8a4f1e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "var(--text-3xl)",
          fontWeight: 800,
          fontFamily: "var(--font-heading)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {community.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={community.bannerUrl}
            alt={community.name}
            referrerPolicy="no-referrer"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          community.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
        )}
      </div>
      <CommunitySearchBar name={community.name} slug={community.slug} />
      <div className="rs-body">
        <div className="rs-card">
          <div className="rs-community-name">{community.name}</div>
          {community.tagline && (
            <div className="rs-tagline">{community.tagline}</div>
          )}
          <div className="rs-stats" style={{ marginTop: 10 }}>
            <div className="rs-stat">
              <span className="dot green"></span>
              <span>
                <span className="num">{community.onlineCount}</span> Online
              </span>
            </div>
            <div className="rs-stat">
              <span className="dot gray"></span>
              <span>
                <span className="num">{community.memberCount}</span> Members
              </span>
            </div>
          </div>
        </div>

        {community.description && (
          <div className="rs-card">
            <div className="rs-description">{community.description}</div>
          </div>
        )}

        <JoinButton
          communityId={community.id}
          communitySlug={community.slug}
          classes={classes}
          tiers={tiers}
        />

        <div className="rs-card">
          <div
            className="rs-section-title"
            style={{ marginTop: 0, marginBottom: 10 }}
          >
            {T("rsWhatYouGet")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {DICT[locale].rsFeatures.map(([icon, text]: [string, string]) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "var(--text-sm)",
                  color: "var(--text-normal)",
                }}
              >
                <span style={{ fontSize: "var(--text-md)" }}>{icon}</span> {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberView({
  community,
  membership,
  classes,
  hasPaidTiers,
  tiers,
  T,
}: {
  community: Community;
  membership: NonNullable<Membership>;
  classes: ClassConfig[];
  hasPaidTiers?: boolean;
  tiers?: TierConfigItem[];
  T: (key: Parameters<typeof tSync>[0]) => string;
  locale: import("@/lib/locale").Locale;
}) {
  const myClass = classByKey(membership.className, classes);

  return (
    <div className="rs-view active">
      <div
        className="rs-banner"
        style={{
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={community.bannerUrl || "/campfire.jpg"}
          alt={community.name}
          referrerPolicy="no-referrer"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>
      {hasPaidTiers && tiers && tiers.filter(t => !t.isFree).length > 0 && (
        <UpgradeBannerButton
          communityId={community.id}
          communitySlug={community.slug}
          tiers={tiers.filter(t => !t.isFree)}
          currentTierKey={membership.tier}
          currentTierLabel={tiers.find(t => t.key === membership.tier)?.label ?? membership.tier}
        />
      )}
      <CommunitySearchBar name={community.name} slug={community.slug} />
      <div className="rs-body">
        <div className="rs-card">
          <div
            className="rs-section-title"
            style={{ marginTop: 0, marginBottom: 10 }}
          >
            {T("rsProgress")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Stat label={T("rsRole")} value={membership.role} />
            <Stat label="Tier" value={membership.tier} />
            <Stat label="XP" value={String(membership.xp)} />
            {classes.length > 0 && (
              <Stat
                label="Class"
                value={
                  myClass
                    ? `${myClass.emoji ? myClass.emoji + " " : ""}${myClass.label}`
                    : "— chưa chọn —"
                }
              />
            )}
          </div>
        </div>

        <div className="rs-card">
          <div
            className="rs-section-title"
            style={{ marginTop: 0, marginBottom: 10 }}
          >
            Tiếp theo
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Hint icon="⚔️" text="Tham gia challenge mới tuần này" />
            <Hint icon="📚" text="Hoàn thành 1 bài học hôm nay (+XP)" />
            <Hint icon="💬" text="Check-in chat để giữ streak" />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InviteCopyButton communityId={community.id} communitySlug={community.slug} />
        </div>

        <div className="rs-card">
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            Community: <strong>{community.name}</strong>
            <br />
            {community.memberCount} thành viên · {community.onlineCount} online
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: "var(--text-sm)",
        color: "var(--text-muted)",
      }}
    >
      <span>{label}</span>
      <strong style={{ color: "var(--text-heading)" }}>{value}</strong>
    </div>
  );
}

function Hint({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "var(--text-sm)",
        color: "var(--text-normal)",
      }}
    >
      <span style={{ fontSize: "var(--text-md)" }}>{icon}</span>
      {text}
    </div>
  );
}
