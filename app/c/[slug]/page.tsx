import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      _count: { select: { memberships: true } },
      channels: { orderBy: { position: "asc" } },
      courses: { where: { isPublished: true }, take: 3 },
      challenges: { where: { status: { in: ["OPEN", "ACTIVE"] } }, take: 3 },
    },
  });

  if (!community) notFound();

  let membership = null;
  if (session?.user) {
    membership = await prisma.membership.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id!,
          communityId: community.id,
        },
      },
    });
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--bg-body)" }}
    >
      {/* Banner */}
      <div
        className="aspect-[16/5] w-full relative flex items-end"
        style={{
          background: "linear-gradient(135deg, #CC785C, #8a4f1e)",
        }}
      >
        <div className="max-w-6xl mx-auto w-full p-8">
          <h1
            className="text-4xl font-extrabold text-white"
            style={{
              fontFamily: "var(--font-roboto)",
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {community.name}
          </h1>
          <p
            className="text-lg mt-2"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            {community.tagline}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8 grid gap-6" style={{ gridTemplateColumns: "1fr 320px" }}>
        {/* Main */}
        <div>
          <div
            className="rounded-xl p-6 mb-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: "var(--text-heading)" }}
            >
              Giới thiệu
            </h2>
            <p style={{ color: "var(--text-normal)", lineHeight: 1.6 }}>
              {community.description}
            </p>
          </div>

          {/* Channels */}
          <div
            className="rounded-xl p-6 mb-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h2
              className="text-xl font-bold mb-3"
              style={{ color: "var(--text-heading)" }}
            >
              💬 Channels ({community.channels.length})
            </h2>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
              {community.channels.map((ch) => (
                <Link
                  key={ch.id}
                  href={membership ? `/c/${community.slug}/chat/${ch.slug}` : "#"}
                  className="px-3 py-2 rounded-md text-sm"
                  style={{
                    background: "var(--bg-elevated)",
                    color: membership ? "var(--text-normal)" : "var(--text-muted)",
                    cursor: membership ? "pointer" : "not-allowed",
                  }}
                >
                  # {ch.name}
                </Link>
              ))}
            </div>
            {!membership && (
              <div className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
                🔒 Tham gia community để chat trong channels
              </div>
            )}
          </div>

          {/* Courses */}
          {community.courses.length > 0 && (
            <div
              className="rounded-xl p-6 mb-4"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <h2
                className="text-xl font-bold mb-3"
                style={{ color: "var(--text-heading)" }}
              >
                📚 Khóa học
              </h2>
              <div className="flex flex-col gap-2">
                {community.courses.map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-3 rounded-lg"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div className="font-bold" style={{ color: "var(--text-heading)" }}>
                      {c.title}
                    </div>
                    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {c.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges */}
          {community.challenges.length > 0 && (
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <h2
                className="text-xl font-bold mb-3"
                style={{ color: "var(--text-heading)" }}
              >
                ⚔️ Challenges
              </h2>
              <div className="flex flex-col gap-2">
                {community.challenges.map((c) => (
                  <div
                    key={c.id}
                    className="px-4 py-3 rounded-lg"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    <div className="font-bold" style={{ color: "var(--text-heading)" }}>
                      {c.title}
                    </div>
                    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {c.difficulty} · {c.requiredDays} ngày
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <div
            className="rounded-xl p-6 sticky top-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="mb-4">
              <div className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
                {community._count.memberships}
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                thành viên
              </div>
            </div>

            {!session?.user ? (
              <Link
                href="/login"
                className="block w-full text-center px-4 py-3 rounded-lg font-bold text-white"
                style={{
                  background: "var(--brand-green)",
                  fontFamily: "var(--font-roboto)",
                }}
              >
                Đăng nhập để tham gia
              </Link>
            ) : membership ? (
              <div
                className="text-center p-3 rounded-lg text-sm"
                style={{
                  background: "var(--brand-green-soft)",
                  color: "var(--brand-green)",
                  fontWeight: 700,
                }}
              >
                ✓ Bạn đã là {membership.role === "OWNER" ? "chủ community" : "thành viên"}
              </div>
            ) : (
              <form
                action={async () => {
                  "use server";
                  const s = await auth();
                  if (!s?.user?.id) return;
                  await prisma.membership.create({
                    data: {
                      userId: s.user.id,
                      communityId: community.id,
                      role: "MEMBER",
                      tier: "EXPLORER",
                    },
                  });
                  await prisma.community.update({
                    where: { id: community.id },
                    data: { memberCount: { increment: 1 } },
                  });
                }}
              >
                <button
                  type="submit"
                  className="block w-full text-center px-4 py-3 rounded-lg font-bold text-white"
                  style={{
                    background: "var(--brand-green)",
                    fontFamily: "var(--font-roboto)",
                  }}
                >
                  Tham gia cộng đồng
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
