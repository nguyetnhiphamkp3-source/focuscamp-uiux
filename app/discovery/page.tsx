import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const communities = await prisma.community.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { memberships: true, challenges: true, courses: true } },
    },
  });

  return (
    <main
      className="min-h-screen p-8"
      style={{ background: "var(--bg-body)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-sm"
              style={{ color: "var(--text-link)" }}
            >
              ← Về trang chủ
            </Link>
            <h1
              className="text-3xl font-extrabold mt-2"
              style={{ color: "var(--text-heading)" }}
            >
              🔭 Discovery
            </h1>
            <p style={{ color: "var(--text-muted)" }}>
              Khám phá communities, challenges & products
            </p>
          </div>
        </div>

        {communities.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="text-5xl mb-3">🏜️</div>
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "var(--text-heading)" }}
            >
              Chưa có community nào
            </h2>
            <p className="mb-4" style={{ color: "var(--text-muted)" }}>
              Platform mới deploy. Chạy seed script hoặc tạo community đầu tiên.
            </p>
            <code
              className="inline-block px-3 py-2 rounded text-xs"
              style={{
                background: "var(--bg-elevated)",
                fontFamily: "var(--font-mono, Consolas, monospace)",
              }}
            >
              pnpm tsx prisma/seed.ts
            </code>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            {communities.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="rounded-xl overflow-hidden transition-transform hover:-translate-y-1"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  boxShadow: "0 1px 3px rgba(60, 45, 20, 0.06)",
                }}
              >
                <div
                  className="aspect-[16/8] flex items-center justify-center text-white text-3xl font-extrabold"
                  style={{
                    background: "linear-gradient(135deg, #CC785C, #8a4f1e)",
                    fontFamily: "var(--font-roboto)",
                  }}
                >
                  {c.name.slice(0, 3).toUpperCase()}
                </div>
                <div className="p-4">
                  <div
                    className="font-bold text-lg"
                    style={{ color: "var(--text-heading)" }}
                  >
                    {c.name}
                  </div>
                  <div
                    className="text-sm mb-3 line-clamp-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {c.tagline}
                  </div>
                  <div
                    className="text-xs flex items-center gap-2"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <span>
                      <strong style={{ color: "var(--text-heading)" }}>
                        {c._count.memberships}
                      </strong>{" "}
                      members
                    </span>
                    <span>·</span>
                    <span>
                      <strong style={{ color: "var(--text-heading)" }}>
                        {c._count.challenges}
                      </strong>{" "}
                      challenges
                    </span>
                    <span>·</span>
                    <span>
                      <strong style={{ color: "var(--text-heading)" }}>
                        {c._count.courses}
                      </strong>{" "}
                      courses
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
