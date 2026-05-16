import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { IntroGallery, type GalleryItem } from "@/components/community/intro-gallery";

export const dynamic = "force-dynamic";

export default async function CommunityHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();

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

  const isOwner = community.ownerId === session?.user?.id;
  const membership = session?.user?.id
    ? await prisma.membership.findUnique({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
      })
    : null;
  const isMember = !!membership;

  if (!isMember && !isOwner) {
    return <CommunityIntroPage community={community} slug={slug} />;
  }

  // ── Member / Owner view ────────────────────────────────────────────────────
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
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
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
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
                    <div style={{ fontWeight: "var(--fw-bold)", color: "var(--text-heading)" }}>
                      {c.title}
                    </div>
                    {c.description && (
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: "var(--space-1)" }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
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
                    <div style={{ fontWeight: "var(--fw-bold)", color: "var(--text-heading)" }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
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

// ── Community intro page for non-members ────────────────────────────────────

type CommunityWithContent = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  bannerUrl: string | null;
  memberCount: number;
  onlineCount: number;
  introVideoUrl: string | null;
  introGallery: unknown;
  courses: { id: string; title: string; slug: string }[];
  challenges: { id: string; title: string; slug: string; difficulty: string; requiredDays: number }[];
};

function buildGallery(community: CommunityWithContent): GalleryItem[] {
  const items: GalleryItem[] = [];
  const seen = new Set<string>();

  const raw = community.introGallery;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        typeof item === "object" && item !== null &&
        "type" in item && "url" in item &&
        typeof (item as GalleryItem).url === "string" &&
        ((item as GalleryItem).type === "video" || (item as GalleryItem).type === "image")
      ) {
        const gi = item as GalleryItem;
        if (!seen.has(gi.url)) { seen.add(gi.url); items.push(gi); }
      }
    }
  }
  if (community.introVideoUrl && !seen.has(community.introVideoUrl)) {
    items.unshift({ type: "video", url: community.introVideoUrl });
  }
  return items;
}

function CommunityIntroPage({
  community,
}: {
  community: CommunityWithContent;
  slug: string;
}) {
  const galleryItems = buildGallery(community);

  return (
    <>
      <header className="view-header">
        <span className="view-title">{community.name}</span>
        {community.tagline && (
          <span className="view-subtitle">{community.tagline}</span>
        )}
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-5) var(--space-6)" }}>
        <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

          {/* Gallery — video + image slideshow */}
          {galleryItems.length > 0 ? (
            <IntroGallery items={galleryItems} />
          ) : community.bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.bannerUrl}
              alt={community.name}
              referrerPolicy="no-referrer"
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: "var(--r-lg)", display: "block" }}
            />
          ) : null}

          {/* Stats row */}
          <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
            {[
              { icon: "👥", value: community.memberCount, label: "thành viên" },
              { icon: "🟢", value: community.onlineCount, label: "online" },
              ...(community.courses.length > 0 ? [{ icon: "📚", value: community.courses.length, label: "khóa học" }] : []),
              ...(community.challenges.length > 0 ? [{ icon: "⚔️", value: community.challenges.length, label: "challenge" }] : []),
            ].map(({ icon, value, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
                <span>{icon}</span>
                <span style={{ fontWeight: "var(--fw-bold)", color: "var(--text-heading)", fontSize: "var(--text-sm)" }}>{value}</span>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {community.description && (
            <section className="ui-card ui-card-lg" style={{ margin: 0 }}>
              <p style={{ lineHeight: "var(--lh-relaxed)", color: "var(--text-normal)", margin: 0, whiteSpace: "pre-wrap" }}>
                {community.description}
              </p>
            </section>
          )}

          {/* Content preview */}
          {(community.courses.length > 0 || community.challenges.length > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: community.courses.length > 0 && community.challenges.length > 0 ? "1fr 1fr" : "1fr",
                gap: "var(--space-3)",
              }}
            >
              {community.courses.length > 0 && (
                <section className="ui-card ui-card-lg" style={{ margin: 0 }}>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-bold)", color: "var(--text-heading)", marginBottom: "var(--space-2)" }}>
                    📚 Khóa học ({community.courses.length})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    {community.courses.slice(0, 5).map((c) => (
                      <div key={c.id} style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", padding: "var(--space-1) 0" }}>
                        📖 {c.title}
                      </div>
                    ))}
                    {community.courses.length > 5 && (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>+{community.courses.length - 5} khóa học nữa…</div>
                    )}
                  </div>
                </section>
              )}

              {community.challenges.length > 0 && (
                <section className="ui-card ui-card-lg" style={{ margin: 0 }}>
                  <h3 style={{ fontSize: "var(--text-base)", fontWeight: "var(--fw-bold)", color: "var(--text-heading)", marginBottom: "var(--space-2)" }}>
                    ⚔️ Challenges ({community.challenges.length})
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
                    {community.challenges.slice(0, 5).map((c) => (
                      <div key={c.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)", color: "var(--text-muted)", padding: "var(--space-1) 0" }}>
                        <span>{c.title}</span>
                        <span style={{ whiteSpace: "nowrap", marginLeft: "var(--space-2)" }}>{c.requiredDays}d</span>
                      </div>
                    ))}
                    {community.challenges.length > 5 && (
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>+{community.challenges.length - 5} challenges nữa…</div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* Empty state */}
          {galleryItems.length === 0 && !community.bannerUrl && !community.description && community.courses.length === 0 && community.challenges.length === 0 && (
            <div style={{ textAlign: "center", padding: "var(--space-10) 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
              Tham gia để khám phá nội dung của community.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
