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
/** Hex anchor color per difficulty — used for accent strips, pill tints, etc. */
function diffColor(d: string): string {
  if (d === "HARD") return "#c97a3f";
  if (d === "CHAOS") return "#b8455a";
  return "#3a8a70";
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
      bannerUrl: string | null;
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
        const accent = diffColor(m.challenge.difficulty);
        return (
          <Link
            key={m.id}
            href={`/c/${slug}/challenges/${m.challenge.slug}`}
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "192px 1fr",
              gap: 16,
              padding: 14,
              paddingLeft: 18,
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 14,
              textDecoration: "none",
              color: "inherit",
              overflow: "hidden",
            }}
          >
            {/* Left accent stripe — color per difficulty */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: accent,
              }}
            />

            {/* Thumbnail — 16:9 to match detail-page banner */}
            <div
              style={{
                position: "relative",
                width: 192,
                aspectRatio: "16 / 9",
                borderRadius: 10,
                overflow: "hidden",
                flexShrink: 0,
                alignSelf: "center",
                background: m.challenge.bannerUrl
                  ? `url("${m.challenge.bannerUrl}") center/cover no-repeat`
                  : `linear-gradient(135deg, ${accent} 0%, ${accent}aa 100%)`,
              }}
              aria-hidden
            >
              {!m.challenge.bannerUrl && (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    color: "rgba(255,255,255,0.85)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  {m.challenge.difficulty === "CHAOS"
                    ? "🔥"
                    : m.challenge.difficulty === "HARD"
                      ? "⚔️"
                      : "🛡️"}
                </span>
              )}
              {/* Day badge corner — quick scan reference */}
              <span
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: 999,
                  fontVariantNumeric: "tabular-nums",
                  backdropFilter: "blur(4px)",
                }}
              >
                {day}/{m.challenge.requiredDays}
              </span>
            </div>

            {/* Right column — info */}
            <div
              style={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {/* Top row: difficulty pill · CTA */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "3px 9px",
                    background: `${accent}1a`,
                    color: accent,
                    border: `1px solid ${accent}40`,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {diffLabel(m.challenge.difficulty)}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--brand-green)",
                  }}
                >
                  Tiếp tục →
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  color: "var(--text-heading)",
                  lineHeight: 1.3,
                  marginBottom: 10,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {m.challenge.title}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  position: "relative",
                  height: 8,
                  background: "var(--bg-elevated)",
                  borderRadius: 999,
                  overflow: "hidden",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${accent} 0%, var(--brand-green) 100%)`,
                    borderRadius: 999,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              {/* Bottom meta row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                <span
                  style={{ fontWeight: 700, color: "var(--text-normal)" }}
                >
                  {pct}%
                </span>
                <span>·</span>
                <span>👥 {m.challenge._count.members} thành viên</span>
              </div>
            </div>
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
    bannerUrl?: string | null;
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
      <div
        className={`ch-card-banner ${diffClass(challenge.difficulty)}`}
        style={
          challenge.bannerUrl
            ? ({ ["--bg-img" as string]: `url("${challenge.bannerUrl}")` } as React.CSSProperties)
            : undefined
        }
      >
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
