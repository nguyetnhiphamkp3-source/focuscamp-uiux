import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function ChallengesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      challenges: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { members: true } },
          leader: { select: { name: true, image: true } },
        },
      },
    },
  });
  if (!community) notFound();

  return (
    <>
      <header className="view-header">
        <span className="view-title">Challenge</span>
        <span className="view-subtitle">
          Thử thách nhóm có lộ trình, SOP, XP thưởng
        </span>
      </header>

      <div className="challenges-view" id="chListView">
        <div className="ch-inner">
          <div className="ch-filters">
            <div className="ch-filter active">Tất cả</div>
            <div className="ch-filter">Đang tham gia</div>
            <div className="ch-filter">Đang mở</div>
            <div className="ch-filter">Đã hoàn thành</div>
          </div>

          {community.challenges.length === 0 ? (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>⚔️</div>
              Chưa có challenge nào.
            </div>
          ) : (
            <div className="ch-grid">
              {community.challenges.map((c) => {
                const statusCls =
                  c.status === "ACTIVE"
                    ? "active"
                    : c.status === "OPEN"
                      ? "open"
                      : "";
                const leaderName = c.leader?.name || "Leader";
                return (
                  <Link
                    key={c.id}
                    href={`/c/${slug}/challenges/${c.slug}`}
                    className="ch-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className={`ch-card-banner ${diffClass(c.difficulty)}`}>
                      <span className="ch-diff-badge">
                        {diffLabel(c.difficulty)}
                      </span>
                      {c.status !== "COMPLETED" && (
                        <span className={`ch-status-badge ${statusCls}`}>
                          {c.status}
                        </span>
                      )}
                      <div className="ch-card-banner-title">{c.title}</div>
                    </div>
                    <div className="ch-card-body">
                      <div className="ch-card-desc">{c.description}</div>
                      <div className="ch-card-meta">
                        <span className="ch-leader">
                          <span className="ch-leader-avatar">
                            {leaderName[0]?.toUpperCase()}
                          </span>
                          <span>{leaderName}</span>
                        </span>
                        <span className="meta-sep">·</span>
                        <span>{c.requiredDays} ngày</span>
                        <span className="meta-sep">·</span>
                        <span>
                          {c._count.members} / {c.maxMembers} members
                        </span>
                      </div>
                      <span
                        className={`ch-card-cta ${c.status === "ACTIVE" ? "joined" : "primary"}`}
                      >
                        {c.status === "ACTIVE"
                          ? "Đang hoạt động →"
                          : c.status === "OPEN"
                            ? "Tham gia ngay"
                            : "Chi tiết"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
