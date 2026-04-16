import { JoinButton } from "./join-button";
import { BossWidget } from "./pixel-wolf";
import { classByKey } from "@/lib/community-config";
import type { ClassConfig } from "@/lib/community-config";
import type { BossState } from "@/lib/services/community-boss";

type Community = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
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
  boss,
}: {
  community: Community;
  membership: Membership;
  isLoggedIn: boolean;
  classes: ClassConfig[];
  boss: BossState;
}) {
  return (
    <aside className="right-sidebar" id="rightSidebar">
      {membership ? (
        <MemberView
          community={community}
          membership={membership}
          classes={classes}
        />
      ) : (
        <GuestView community={community} classes={classes} />
      )}
      <BossWidget
        name={boss.name}
        tagline={boss.tagline}
        hpPct={boss.hpPct}
        currentHp={boss.currentHp}
        maxHp={boss.maxHp}
        defeated={boss.defeated}
      />
    </aside>
  );
}

function GuestView({
  community,
  classes,
}: {
  community: Community;
  classes: ClassConfig[];
}) {
  return (
    <div className="rs-view active">
      <div
        className="rs-banner"
        style={{
          background: "linear-gradient(135deg,#c77a2d,#8a4f1e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "var(--text-3xl)",
          fontWeight: 800,
          fontFamily: "var(--font-heading)",
        }}
      >
        {community.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()}
      </div>
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
        />

        <div className="rs-card">
          <div
            className="rs-section-title"
            style={{ marginTop: 0, marginBottom: 10 }}
          >
            What you&apos;ll get
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["📚", "Structured learning paths"],
              ["⚔️", "Weekly build challenges"],
              ["🛒", "Exclusive deals & tools"],
              ["👥", "Mentorship & networking"],
              ["🏆", "Achievements & rewards"],
            ].map(([icon, text]) => (
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
}: {
  community: Community;
  membership: NonNullable<Membership>;
  classes: ClassConfig[];
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
          src="/campfire.jpg"
          alt="Campfire"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: "var(--text-md)",
            fontWeight: "var(--fw-bold)",
            textAlign: "center",
            padding: "var(--space-4)",
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 100%)",
            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}
        >
          🏕️ Chào mừng trở lại!
        </div>
      </div>
      <div className="rs-body">
        <div className="rs-card">
          <div
            className="rs-section-title"
            style={{ marginTop: 0, marginBottom: 10 }}
          >
            Tiến độ của bạn
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Stat label="Role" value={membership.role} />
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
          {classes.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <JoinButton
                communityId={community.id}
                communitySlug={community.slug}
                classes={classes}
                currentClassKey={membership.className}
                label={myClass ? "Đổi class" : "Chọn class"}
                variant="secondary"
              />
            </div>
          )}
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

        <button className="rs-join-btn secondary" style={{ margin: "4px 0" }}>
          Invite People
        </button>

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
