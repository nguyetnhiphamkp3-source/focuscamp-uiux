import { prisma } from "@/lib/prisma";
import { SectionHeader } from "./editor-shared";

/**
 * Server component — admin dashboard mini-stats for a community.
 * Shows 7d / 30d / all counts for posts, comments, checkins, XP awarded.
 */
export async function CommunityStatsCard({
  communityId,
}: {
  communityId: string;
}) {
  const d7 = new Date();
  d7.setDate(d7.getDate() - 7);
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);

  const [
    posts7, posts30, postsAll,
    comments7, comments30, commentsAll,
    checkins7, checkins30, checkinsAll,
    xp7, xp30, xpAll,
    topActive,
  ] = await Promise.all([
    prisma.post.count({ where: { communityId, createdAt: { gte: d7 } } }),
    prisma.post.count({ where: { communityId, createdAt: { gte: d30 } } }),
    prisma.post.count({ where: { communityId } }),
    prisma.comment.count({
      where: { post: { communityId }, createdAt: { gte: d7 } },
    }),
    prisma.comment.count({
      where: { post: { communityId }, createdAt: { gte: d30 } },
    }),
    prisma.comment.count({ where: { post: { communityId } } }),
    prisma.checkin.count({
      where: { challenge: { communityId }, createdAt: { gte: d7 } },
    }),
    prisma.checkin.count({
      where: { challenge: { communityId }, createdAt: { gte: d30 } },
    }),
    prisma.checkin.count({ where: { challenge: { communityId } } }),
    prisma.xPLedger.aggregate({
      where: { communityId, createdAt: { gte: d7 }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.xPLedger.aggregate({
      where: { communityId, createdAt: { gte: d30 }, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.xPLedger.aggregate({
      where: { communityId, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.membership.findMany({
      where: { communityId },
      orderBy: { xp: "desc" },
      take: 3,
      include: {
        user: { select: { name: true, email: true, image: true } },
      },
    }),
  ]);

  return (
    <section
      className="ui-card ui-card-lg"
      style={{ marginBottom: "var(--space-4)" }}
    >
      <SectionHeader
        title="📊 Thống kê cộng đồng"
        subtitle="Tổng quan hoạt động — 7 ngày / 30 ngày / all-time."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "var(--border-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Col head="Metric" rows={["Bài viết", "Bình luận", "Check-ins", "XP cộng"]} />
        <Col
          head="7 ngày"
          rows={[
            posts7.toString(),
            comments7.toString(),
            checkins7.toString(),
            (xp7._sum.amount ?? 0).toLocaleString(),
          ]}
        />
        <Col
          head="30 ngày"
          rows={[
            posts30.toString(),
            comments30.toString(),
            checkins30.toString(),
            (xp30._sum.amount ?? 0).toLocaleString(),
          ]}
        />
        <Col
          head="All-time"
          rows={[
            postsAll.toString(),
            commentsAll.toString(),
            checkinsAll.toString(),
            (xpAll._sum.amount ?? 0).toLocaleString(),
          ]}
        />
      </div>

      {topActive.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Top 3 contributors
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topActive.map((m, i) => (
              <div
                key={m.userId}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "6px 10px",
                  background: "var(--bg-card)",
                  borderRadius: 6,
                  fontSize: "var(--text-sm)",
                }}
              >
                <span style={{ width: 20, color: "var(--text-muted)" }}>
                  {i + 1}.
                </span>
                <span style={{ flex: 1 }}>
                  {m.user.name ?? m.user.email ?? "Ẩn danh"}
                </span>
                <span
                  style={{
                    color: "var(--brand-green)",
                    fontWeight: 700,
                  }}
                >
                  {m.xp.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Col({ head, rows }: { head: string; rows: string[] }) {
  const isLabel = head === "Metric";
  return (
    <div
      style={{
        background: "var(--bg-card)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          fontSize: "var(--text-xs)",
          color: "var(--text-muted)",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {head}
      </div>
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            padding: "8px 10px",
            fontSize: "var(--text-sm)",
            color: isLabel ? "var(--text-muted)" : "var(--header-primary)",
            fontWeight: isLabel ? 400 : 700,
            borderBottom:
              i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {r}
        </div>
      ))}
    </div>
  );
}
