import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CommunityHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      courses: { where: { isPublished: true }, take: 6 },
      challenges: {
        where: { status: { in: ["OPEN", "ACTIVE"] } },
        take: 6,
      },
      channels: { orderBy: { position: "asc" }, take: 5 },
    },
  });
  if (!community) notFound();

  return (
    <div style={{ overflowY: "auto", padding: "24px 32px" }}>
      <div style={{ maxWidth: 900 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 4,
            color: "var(--text-heading)",
          }}
        >
          {community.name}
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          {community.tagline}
        </p>

        {community.description && (
          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
              Giới thiệu
            </h2>
            <p style={{ color: "var(--text-normal)", lineHeight: 1.7 }}>
              {community.description}
            </p>
          </section>
        )}

        {community.channels.length > 0 && (
          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              💬 Channels
            </h2>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              }}
            >
              {community.channels.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/c/${slug}/chat/${ch.slug}`}
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 14,
                    color: "var(--text-normal)",
                    textDecoration: "none",
                  }}
                >
                  # {ch.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {community.courses.length > 0 && (
          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              📚 Khóa học
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {community.courses.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-heading)" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {c.description}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {community.challenges.length > 0 && (
          <section
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              ⚔️ Challenges
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {community.challenges.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-heading)" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {c.difficulty} · {c.requiredDays} ngày
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
