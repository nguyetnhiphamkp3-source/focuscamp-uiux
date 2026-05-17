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
      owner: { select: { id: true, name: true, image: true } },
      posts: {
        where: { isPinned: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, body: true, createdAt: true },
      },
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
          {/* Onboarding card */}
          <section
            className="ui-card ui-card-lg"
            style={{ marginBottom: "var(--space-5)" }}
          >
            <h2 style={{ marginBottom: "var(--space-3)" }}>👋 Bắt đầu tại đây</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              {community.channels.length > 0 && (
                <Link
                  href={`/c/${slug}/chat/${community.channels[0].slug}`}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--r-md)", textDecoration: "none", color: "var(--text-normal)", fontSize: "var(--text-sm)" }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "var(--brand-green)", flexShrink: 0 }}><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
                  Tham gia chat cộng đồng
                </Link>
              )}
              {community.challenges.length > 0 && (
                <Link
                  href={`/c/${slug}/challenges`}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--r-md)", textDecoration: "none", color: "var(--text-normal)", fontSize: "var(--text-sm)" }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "var(--brand-green)", flexShrink: 0 }}><path d="M7 2v11h3v9l7-12h-4l3-8z" /></svg>
                  Tham gia challenge đầu tiên
                </Link>
              )}
              {community.courses.length > 0 && (
                <Link
                  href={`/c/${slug}/courses`}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--r-md)", textDecoration: "none", color: "var(--text-normal)", fontSize: "var(--text-sm)" }}
                >
                  <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, fill: "var(--brand-green)", flexShrink: 0 }}><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" /></svg>
                  Khám phá các khóa học
                </Link>
              )}
              {community.description && (
                <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: "var(--lh-relaxed)", margin: 0, paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-subtle)" }}>
                  {community.description}
                </p>
              )}
            </div>
          </section>

          {/* Pinned announcements */}
          {community.posts.length > 0 && (
            <section
              className="ui-card ui-card-lg"
              style={{ marginBottom: "var(--space-5)" }}
            >
              <h2 style={{ marginBottom: "var(--space-3)" }}>📌 Thông báo quan trọng</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {community.posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/c/${slug}/p/${post.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        padding: "var(--space-3)",
                        background: "var(--bg-elevated)",
                        borderRadius: "var(--r-md)",
                        borderLeft: "3px solid var(--brand-green)",
                      }}
                    >
                      {post.title && (
                        <div style={{ fontWeight: "var(--fw-bold)", color: "var(--text-heading)", fontSize: "var(--text-base)", marginBottom: "var(--space-1)" }}>
                          {post.title}
                        </div>
                      )}
                      <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", lineHeight: "var(--lh-relaxed)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {post.body}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
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
  owner: { id: string; name: string | null; image: string | null };
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
          <div style={{ display: "flex", gap: "var(--space-6)", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "var(--text-muted)", flexShrink: 0 }}>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <span style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-base)" }}>{community.memberCount}</span>
              <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>thành viên</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-base)" }}>{community.onlineCount}</span>
              <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>online</span>
            </div>
            {community.courses.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "var(--text-muted)", flexShrink: 0 }}>
                  <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
                </svg>
                <span style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-base)" }}>{community.courses.length}</span>
                <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>khóa học</span>
              </div>
            )}
            {community.challenges.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "var(--text-muted)", flexShrink: 0 }}>
                  <path d="M7 2v11h3v9l7-12h-4l3-8z" />
                </svg>
                <span style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-base)" }}>{community.challenges.length}</span>
                <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>challenge</span>
              </div>
            )}
          </div>

          {/* Owner */}
          <Link
            href={`/c/${community.slug}/profile/${community.owner.id}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
          >
            {community.owner.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={community.owner.image}
                alt={community.owner.name ?? "Owner"}
                referrerPolicy="no-referrer"
                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--text-muted)", fontSize: "var(--text-sm)", flexShrink: 0 }}>
                {(community.owner.name ?? "?")[0].toUpperCase()}
              </div>
            )}
            <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>
              By <strong style={{ color: "var(--text-heading)" }}>{community.owner.name ?? "Community Owner"}</strong>
            </span>
          </Link>

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
