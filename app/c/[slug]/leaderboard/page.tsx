import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = [
  "linear-gradient(135deg,#e67e22,#d35400)",
  "linear-gradient(135deg,#5865F2,#7289DA)",
  "linear-gradient(135deg,#1abc9c,#16a085)",
  "linear-gradient(135deg,#2ecc71,#27ae60)",
  "linear-gradient(135deg,#9b59b6,#8e44ad)",
  "linear-gradient(135deg,#e74c3c,#c0392b)",
  "linear-gradient(135deg,#f39c12,#d68910)",
];

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
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                color: "var(--text-muted)",
                marginTop: 20,
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              Chưa có thành viên nào có XP.
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
