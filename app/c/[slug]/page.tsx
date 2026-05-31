import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { IntroGallery, type GalleryItem } from "@/components/community/intro-gallery";
import { MessageSquare, Zap, BookOpen, Users, Tag, Lock } from "lucide-react";

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
          {/* Intro section — same as guest view */}
          <CommunityIntroSection community={community} slug={slug} />

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
                  <MessageSquare size={16} style={{ color: "var(--brand-green)", flexShrink: 0 }} />
                  Tham gia chat cộng đồng
                </Link>
              )}
              {community.challenges.length > 0 && (
                <Link
                  href={`/c/${slug}/challenges`}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--r-md)", textDecoration: "none", color: "var(--text-normal)", fontSize: "var(--text-sm)" }}
                >
                  <Zap size={16} style={{ color: "var(--brand-green)", flexShrink: 0 }} />
                  Tham gia challenge đầu tiên
                </Link>
              )}
              {community.courses.length > 0 && (
                <Link
                  href={`/c/${slug}/courses`}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "var(--space-2) var(--space-3)", background: "var(--bg-elevated)", borderRadius: "var(--r-md)", textDecoration: "none", color: "var(--text-normal)", fontSize: "var(--text-sm)" }}
                >
                  <BookOpen size={16} style={{ color: "var(--brand-green)", flexShrink: 0 }} />
                  Khám phá các khóa học
                </Link>
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

// Shared intro section: gallery + stats + owner + description
// Used in both guest view and member view (at top)
function CommunityIntroSection({
  community,
  slug,
}: {
  community: CommunityWithContent;
  slug: string;
}) {
  const galleryItems = buildGallery(community);
  const hasContent = galleryItems.length > 0 || community.bannerUrl || community.description ||
    community.courses.length > 0 || community.challenges.length > 0;
  if (!hasContent) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-5)" }}>
      {/* Gallery */}
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
          <Users size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
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
            <BookOpen size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-base)" }}>{community.courses.length}</span>
            <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>khóa học</span>
          </div>
        )}
        {community.challenges.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ fontWeight: 700, color: "var(--text-heading)", fontSize: "var(--text-base)" }}>{community.challenges.length}</span>
            <span style={{ fontSize: "var(--text-base)", color: "var(--text-muted)" }}>challenge</span>
          </div>
        )}
      </div>

      {/* Owner */}
      <Link
        href={`/c/${slug}/profile/${community.owner.id}`}
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
    </div>
  );
}

function CommunityIntroPage({
  community,
  slug,
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
          <CommunityIntroSection community={community} slug={slug} />

          {/* Content preview (guest only) */}
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
