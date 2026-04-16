import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { AVATAR_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      memberships: {
        orderBy: { xp: "desc" },
        take: 30,
        include: { user: { select: { name: true, email: true, image: true } } },
      },
    },
  });
  if (!community) notFound();

  const top = community.memberships;
  const [first, second, third, ...rest] = top;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Bảng xếp hạng</span>
        <span className="view-subtitle">Cộng đồng top performers</span>
      </header>
      <div className="lb-view">
        <div className="lb-inner">
          <div className="lb-tabs">
            <div className="lb-tab active">All-time</div>
            <div className="lb-tab">Tháng này</div>
            <div className="lb-tab">Tuần này</div>
          </div>

          {top.length >= 3 && (
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
                <div key={m.id} className="lb-row">
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
                    <div className="lb-row-xp">{m.xp.toLocaleString("vi-VN")} XP</div>
                  </div>
                </div>
              );
            })}
          </div>

          {top.length === 0 && (
            <div style={{ marginTop: "var(--space-5)" }}>
              <EmptyState
                icon="🏆"
                title="Chưa có thành viên nào có XP"
                description="XP sẽ được tích luỹ khi members hoạt động (check-in, hoàn thành task, đóng góp bài viết...)."
              />
            </div>
          )}
        </div>
      </div>
    </>
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
