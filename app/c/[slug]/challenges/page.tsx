import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateChallengeButton } from "@/components/community/create-challenge-button";

export const dynamic = "force-dynamic";

function diffClass(d: string) {
  if (d === "HARD") return "diff-hard";
  if (d === "CHAOS") return "diff-chaos";
  return "diff-normal";
}
function diffLabel(d: string) {
  if (d === "HARD") return "⚔️ Hard";
  if (d === "CHAOS") return "🔥 Chaos";
  return "🛡️ Normal";
}

type Tab = "active" | "completed" | "explore";

export default async function QuestLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: Tab }>;
}) {
  const { slug } = await params;
  const { tab = "active" } = await searchParams;
  const session = await auth();

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  // Load by tab — only query what we need
  const myMemberships = session?.user?.id
    ? await prisma.challengeMember.findMany({
        where: {
          userId: session.user.id,
          challenge: { communityId: community.id },
        },
        include: {
          challenge: {
            include: { _count: { select: { members: true } } },
          },
        },
        orderBy: { joinedAt: "desc" },
      })
    : [];

  const activeMemberships = myMemberships.filter((m) => m.status === "ACTIVE");
  const completedMemberships = myMemberships.filter(
    (m) => m.status === "COMPLETED"
  );
  const myChallengeIds = new Set(myMemberships.map((m) => m.challengeId));

  const availableChallenges =
    tab === "explore"
      ? await prisma.challenge.findMany({
          where: {
            communityId: community.id,
            status: { in: ["OPEN", "ACTIVE"] },
            id: { notIn: [...myChallengeIds] },
          },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { members: true } } },
        })
      : [];

  const featured =
    tab === "active" && activeMemberships.length === 0
      ? await prisma.challenge.findFirst({
          where: {
            communityId: community.id,
            status: { in: ["OPEN", "ACTIVE"] },
          },
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { members: true } } },
        })
      : null;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Quest Log</span>
        <span className="view-subtitle">
          Hành trình chinh phục của bạn tại {community.name}
        </span>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-5) var(--space-6) var(--space-10)",
        }}
      >
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {/* Admin: create new challenge */}
          {session?.user?.id === community.ownerId && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "var(--space-4)",
              }}
            >
              <CreateChallengeButton
                communityId={community.id}
                communitySlug={slug}
              />
            </div>
          )}
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              marginBottom: "var(--space-5)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <TabLink
              slug={slug}
              to="active"
              current={tab}
              label="⚔️ Đang chinh phục"
              count={activeMemberships.length}
            />
            <TabLink
              slug={slug}
              to="completed"
              current={tab}
              label="🏆 Thành tựu"
              count={completedMemberships.length}
            />
            <TabLink
              slug={slug}
              to="explore"
              current={tab}
              label="🗺️ Khám phá"
            />
          </div>

          {/* Content */}
          {tab === "active" && (
            <ActiveTab
              slug={slug}
              memberships={activeMemberships}
              featured={featured}
            />
          )}
          {tab === "completed" && (
            <CompletedTab slug={slug} memberships={completedMemberships} />
          )}
          {tab === "explore" && (
            <ExploreTab slug={slug} challenges={availableChallenges} />
          )}
        </div>
      </div>
    </>
  );
}

function TabLink({
  slug,
  to,
  current,
  label,
  count,
}: {
  slug: string;
  to: Tab;
  current: Tab;
  label: string;
  count?: number;
}) {
  const active = current === to;
  return (
    <Link
      href={`/c/${slug}/challenges?tab=${to}`}
      style={{
        padding: "var(--space-3) var(--space-4)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? "var(--fw-bold)" : "var(--fw-medium)",
        color: active ? "var(--text-heading)" : "var(--text-muted)",
        textDecoration: "none",
        borderBottom: active
          ? "2px solid var(--brand-green)"
          : "2px solid transparent",
        marginBottom: -1,
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          style={{
            marginLeft: 6,
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
          }}
        >
          · {count}
        </span>
      )}
    </Link>
  );
}

/* ========== ACTIVE TAB ========== */
function ActiveTab({
  slug,
  memberships,
  featured,
}: {
  slug: string;
  memberships: Array<{
    id: string;
    status: string;
    personalStartsAt: Date | null;
    challenge: {
      id: string;
      slug: string;
      title: string;
      difficulty: string;
      requiredDays: number;
      _count: { members: number };
    };
  }>;
  featured: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    requiredDays: number;
    _count: { members: number };
  } | null;
}) {
  if (memberships.length === 0) {
    return (
      <>
        <EmptyState
          icon="🎯"
          title="Chưa có thử thách nào đang chinh phục"
          description="Mỗi hành trình bắt đầu bằng 1 bước. Chọn challenge đầu tiên ngay."
          action={
            <Link
              href={`/c/${slug}/challenges?tab=explore`}
              className="ui-btn ui-btn-primary"
            >
              Khám phá challenges
            </Link>
          }
        />
        {featured && (
          <div style={{ marginTop: "var(--space-8)" }}>
            <h2 style={{ marginBottom: "var(--space-3)" }}>
              🌟 Đề xuất cho bạn
            </h2>
            <ChallengeCard
              slug={slug}
              challenge={featured}
              cta="Tham gia ngay"
            />
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {memberships.map((m) => {
        const day = m.personalStartsAt
          ? Math.min(
              m.challenge.requiredDays,
              Math.max(
                1,
                Math.floor(
                  (Date.now() - m.personalStartsAt.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1
              )
            )
          : 1;
        const pct = Math.round((day / m.challenge.requiredDays) * 100);
        return (
          <Link
            key={m.id}
            href={`/c/${slug}/challenges/${m.challenge.slug}`}
            className="ui-card"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "var(--space-3)",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-1)",
                }}
              >
                <span className={`ch-diff-badge ${diffClass(m.challenge.difficulty)}`}
                  style={{ position: "static", padding: "2px 8px", borderRadius: "var(--r-sm)" }}
                >
                  {diffLabel(m.challenge.difficulty)}
                </span>
              </div>
              <div
                style={{
                  fontSize: "var(--text-md)",
                  fontWeight: "var(--fw-bold)",
                  color: "var(--text-heading)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {m.challenge.title}
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--bg-elevated)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: "var(--brand-green)",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: "var(--space-1)",
                }}
              >
                Day {day} / {m.challenge.requiredDays} ·{" "}
                {m.challenge._count.members} thành viên
              </div>
            </div>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: "var(--fw-bold)",
                color: "var(--brand-green)",
              }}
            >
              Tiếp tục →
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* ========== COMPLETED TAB ========== */
function CompletedTab({
  slug,
  memberships,
}: {
  slug: string;
  memberships: Array<{
    id: string;
    completedAt: Date | null;
    challenge: {
      slug: string;
      title: string;
      difficulty: string;
    };
  }>;
}) {
  if (memberships.length === 0) {
    return (
      <EmptyState
        icon="🏆"
        title="Chưa hoàn thành thử thách nào"
        description="Hoàn tất challenge đầu tiên để unlock badge + XP."
      />
    );
  }
  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-3)",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}
    >
      {memberships.map((m) => (
        <Link
          key={m.id}
          href={`/c/${slug}/challenges/${m.challenge.slug}`}
          className="ui-card"
          style={{
            textDecoration: "none",
            color: "inherit",
            textAlign: "center",
            padding: "var(--space-5)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: "var(--space-2)" }}>🏆</div>
          <div
            style={{
              fontSize: "var(--text-md)",
              fontWeight: "var(--fw-bold)",
              color: "var(--text-heading)",
              marginBottom: "var(--space-1)",
            }}
          >
            {m.challenge.title}
          </div>
          <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {diffLabel(m.challenge.difficulty)}
            {m.completedAt &&
              ` · Hoàn thành ${m.completedAt.toLocaleDateString("vi-VN")}`}
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ========== EXPLORE TAB ========== */
function ExploreTab({
  slug,
  challenges,
}: {
  slug: string;
  challenges: Array<{
    id: string;
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    requiredDays: number;
    status: string;
    maxMembers: number;
    _count: { members: number };
  }>;
}) {
  if (challenges.length === 0) {
    return (
      <EmptyState
        icon="🗺️"
        title="Chưa có challenge nào mới"
        description="Admin sẽ sớm mở thử thách tiếp theo. Check lại sau nhé."
      />
    );
  }
  return (
    <div className="ch-grid">
      {challenges.map((c) => (
        <ChallengeCard key={c.id} slug={slug} challenge={c} />
      ))}
    </div>
  );
}

function ChallengeCard({
  slug,
  challenge,
  cta = "Chi tiết",
}: {
  slug: string;
  challenge: {
    slug: string;
    title: string;
    description: string | null;
    difficulty: string;
    requiredDays: number;
    _count: { members: number };
  };
  cta?: string;
}) {
  return (
    <Link
      href={`/c/${slug}/challenges/${challenge.slug}`}
      className="ch-card"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className={`ch-card-banner ${diffClass(challenge.difficulty)}`}>
        <span className="ch-diff-badge">{diffLabel(challenge.difficulty)}</span>
        <div className="ch-card-banner-title">{challenge.title}</div>
      </div>
      <div className="ch-card-body">
        <div className="ch-card-desc">
          {challenge.description || "Challenge trong focus.camp."}
        </div>
        <div className="ch-card-meta">
          <span>{challenge.requiredDays} ngày</span>
          <span className="meta-sep">·</span>
          <span>{challenge._count.members} đang tham gia</span>
        </div>
        <span className="ch-card-cta primary">{cta}</span>
      </div>
    </Link>
  );
}
