import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { AVATAR_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";

type Period = "all" | "month" | "week";

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const period: Period =
    sp.period === "month" ? "month" : sp.period === "week" ? "week" : "all";

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!community) notFound();

  // For "all-time" we still use Membership.xp (authoritative snapshot).
  // For "month"/"week" we aggregate XPLedger in timeframe.
  type Row = {
    userId: string;
    xp: number;
    tier: string;
    role: string;
    user: { name: string | null; email: string; image: string | null };
  };
  let rows: Row[] = [];

  if (period === "all") {
    const members = await prisma.membership.findMany({
      where: { communityId: community.id },
      orderBy: { xp: "desc" },
      take: 30,
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
    });
    rows = members.map((m) => ({
      userId: m.userId,
      xp: m.xp,
      tier: m.tier,
      role: m.role,
      user: m.user,
    }));
  } else {
    const since = new Date();
    if (period === "month") since.setDate(since.getDate() - 30);
    else since.setDate(since.getDate() - 7);

    // Aggregate XP in timeframe, only among members of this community
    const memberIds = await prisma.membership.findMany({
      where: { communityId: community.id },
      select: { userId: true, tier: true, role: true },
    });
    const memberMap = new Map(
      memberIds.map((m) => [m.userId, { tier: m.tier, role: m.role }])
    );
    const sums = await prisma.xPLedger.groupBy({
      by: ["userId"],
      where: {
        userId: { in: memberIds.map((m) => m.userId) },
        createdAt: { gte: since },
        amount: { gt: 0 }, // ignore penalties for leaderboard
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 30,
    });
    const users = await prisma.user.findMany({
      where: { id: { in: sums.map((s) => s.userId) } },
      select: { id: true, name: true, email: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    rows = sums
      .map((s) => {
        const user = userMap.get(s.userId);
        const meta = memberMap.get(s.userId);
        if (!user || !meta) return null;
        return {
          userId: s.userId,
          xp: s._sum.amount ?? 0,
          tier: meta.tier,
          role: meta.role,
          user: { name: user.name, email: user.email, image: user.image },
        };
      })
      .filter((r): r is Row => r !== null);
  }

  const [first, second, third, ...rest] = rows;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Bảng xếp hạng</span>
        <span className="view-subtitle">
          {community.name} · Top performers (
          {period === "all"
            ? "All-time"
            : period === "month"
              ? "30 ngày qua"
              : "7 ngày qua"}
          )
        </span>
      </header>
      <div className="lb-view">
        <div className="lb-inner">
          <div className="lb-tabs">
            <LbTab slug={slug} active={period === "all"} periodParam="" label="All-time" />
            <LbTab
              slug={slug}
              active={period === "month"}
              periodParam="month"
              label="Tháng này"
            />
            <LbTab
              slug={slug}
              active={period === "week"}
              periodParam="week"
              label="Tuần này"
            />
          </div>

          {rows.length >= 3 && (
            <div className="lb-podium">
              <PodiumSlot rank={2} m={second} colorIdx={1} tier="silver" />
              <PodiumSlot rank={1} m={first} colorIdx={0} tier="gold" crown />
              <PodiumSlot rank={3} m={third} colorIdx={2} tier="bronze" />
            </div>
          )}

          <div className="lb-rows">
            {rest.map((m, i) => {
              const name = m.user.name || m.user.email || "Member";
              return (
                <div key={m.userId} className="lb-row">
                  <div className="lb-row-rank">{i + 4}</div>
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.user.image}
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="lb-row-avatar"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="lb-row-avatar"
                      style={{ background: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length] }}
                    >
                      {name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="lb-row-info">
                    <div className="lb-row-name">{name}</div>
                    <div className="lb-row-meta">
                      <span>{m.tier}</span>
                      <span className="sep">·</span>
                      <span>{m.role}</span>
                    </div>
                  </div>
                  <div className="lb-row-score">
                    <div className="lb-row-xp">
                      {m.xp.toLocaleString("vi-VN")} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {rows.length === 0 && (
            <div style={{ marginTop: "var(--space-5)" }}>
              <EmptyState
                icon="🏆"
                title={
                  period === "all"
                    ? "Chưa có thành viên nào có XP"
                    : "Chưa có hoạt động trong khoảng này"
                }
                description="XP sẽ được tích luỹ khi members hoạt động (check-in, hoàn thành task, đóng góp bài viết...)."
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LbTab({
  slug,
  active,
  periodParam,
  label,
}: {
  slug: string;
  active: boolean;
  periodParam: string;
  label: string;
}) {
  const href = periodParam
    ? `/c/${slug}/leaderboard?period=${periodParam}`
    : `/c/${slug}/leaderboard`;
  return (
    <Link
      href={href}
      className={`lb-tab ${active ? "active" : ""}`}
      style={{ textDecoration: "none" }}
    >
      {label}
    </Link>
  );
}

function PodiumSlot({
  rank,
  m,
  colorIdx,
  tier,
  crown,
}: {
  rank: number;
  m: {
    xp: number;
    tier: string;
    role: string;
    user: { name: string | null; email: string | null; image: string | null };
  };
  colorIdx: number;
  tier: string;
  crown?: boolean;
}) {
  const name = m.user.name || m.user.email || "Member";
  return (
    <div className={`lb-podium-slot ${tier}`}>
      {crown && <div style={{ fontSize: 24, marginBottom: -4 }}>👑</div>}
      <div className="lb-podium-rank">{rank}</div>
      {m.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.user.image}
          alt={name}
          referrerPolicy="no-referrer"
          className="lb-podium-avatar"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div
          className="lb-podium-avatar"
          style={{ background: AVATAR_COLORS[colorIdx % AVATAR_COLORS.length] }}
        >
          {name[0]?.toUpperCase()}
        </div>
      )}
      <div className="lb-podium-name">{name}</div>
      <div className="lb-podium-class">
        {m.tier} · {m.role}
      </div>
      <div className="lb-podium-xp">{m.xp.toLocaleString("vi-VN")} XP</div>
    </div>
  );
}
