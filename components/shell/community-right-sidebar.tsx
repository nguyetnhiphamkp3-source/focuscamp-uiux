import { auth, signIn } from "@/auth";
import { revalidatePath } from "next/cache";
import { joinCommunity } from "@/lib/services/community";
import { logError } from "@/lib/logger";

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
} | null;

export async function CommunityRightSidebar({
  community,
  membership,
  isLoggedIn,
}: {
  community: Community;
  membership: Membership;
  isLoggedIn: boolean;
}) {
  async function joinAction() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) {
      await signIn("google", { redirectTo: `/c/${community.slug}` });
      return;
    }
    try {
      await joinCommunity(s.user.id, community.id);
      revalidatePath(`/c/${community.slug}`);
    } catch (err) {
      logError(err, { userId: s.user.id, communityId: community.id });
      throw err;
    }
  }

  return (
    <aside className="right-sidebar" id="rightSidebar">
      {membership ? (
        <MemberView community={community} membership={membership} />
      ) : (
        <GuestView
          community={community}
          isLoggedIn={isLoggedIn}
          joinAction={joinAction}
        />
      )}
    </aside>
  );
}

function GuestView({
  community,
  joinAction,
}: {
  community: Community;
  isLoggedIn: boolean;
  joinAction: () => void;
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

        <form action={joinAction}>
          <button
            type="submit"
            className="rs-join-btn primary"
            style={{ margin: "4px 0" }}
          >
            Tham gia cộng đồng
          </button>
        </form>

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
}: {
  community: Community;
  membership: NonNullable<Membership>;
}) {
  return (
    <div className="rs-view active">
      <div
        className="rs-banner"
        style={{
          background: "linear-gradient(135deg,#1B9E75,#157a5b)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: "var(--text-md)",
          fontWeight: 700,
          textAlign: "center",
          padding: 16,
        }}
      >
        🏕️ Chào mừng trở lại!
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
