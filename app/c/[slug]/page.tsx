import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";

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
      channels: { orderBy: { position: "asc" }, take: 8 },
    },
  });
  if (!community) notFound();

  return (
    <>
      <header className="view-header">
        <span className="view-title">{community.name}</span>
        {community.tagline && (
          <span className="view-subtitle">{community.tagline}</span>
        )}
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-6) var(--space-8)",
        }}
      >
        <div style={{ maxWidth: 920 }}>
          {community.description && (
            <section
              className="ui-card ui-card-lg"
              style={{ marginBottom: "var(--space-5)" }}
            >
              <h2 style={{ marginBottom: "var(--space-2)" }}>Giới thiệu</h2>
              <p style={{ lineHeight: "var(--lh-relaxed)" }}>
                {community.description}
              </p>
            </section>
          )}

          {community.channels.length > 0 && (
            <section
              className="ui-card ui-card-lg"
              style={{ marginBottom: "var(--space-5)" }}
            >
              <h2 style={{ marginBottom: "var(--space-3)" }}>💬 Channels</h2>
              <div
                style={{
                  display: "grid",
                  gap: "var(--space-2)",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(180px, 1fr))",
                }}
              >
                {community.channels.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/c/${slug}/chat/${ch.slug}`}
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--r-md)",
                      padding: "var(--space-2) var(--space-3)",
                      fontSize: "var(--text-sm)",
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
              className="ui-card ui-card-lg"
              style={{ marginBottom: "var(--space-5)" }}
            >
              <h2 style={{ marginBottom: "var(--space-3)" }}>📚 Khóa học</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                {community.courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${slug}/courses/${c.slug}`}
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--r-md)",
                      padding: "var(--space-3)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "var(--fw-bold)",
                        color: "var(--text-heading)",
                      }}
                    >
                      {c.title}
                    </div>
                    {c.description && (
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                          marginTop: "var(--space-1)",
                        }}
                      >
                        {c.description}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {community.challenges.length > 0 && (
            <section className="ui-card ui-card-lg">
              <h2 style={{ marginBottom: "var(--space-3)" }}>⚔️ Challenges</h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                {community.challenges.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${slug}/challenges/${c.slug}`}
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--r-md)",
                      padding: "var(--space-3)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "var(--fw-bold)",
                        color: "var(--text-heading)",
                      }}
                    >
                      {c.title}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {c.difficulty} · {c.requiredDays} ngày
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {community.courses.length === 0 &&
            community.challenges.length === 0 &&
            community.channels.length === 0 && (
              <EmptyState
                icon="🏕️"
                title="Community vừa được tạo"
                description="Admin đang chuẩn bị nội dung — channels, courses, challenges sẽ sớm có mặt."
              />
            )}
        </div>
      </div>
    </>
  );
}
