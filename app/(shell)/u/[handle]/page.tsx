import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";

export const dynamic = "force-dynamic";

/**
 * Global user landing page — Skool-lite version. Shows identity +
 * community chips. Per-community stats only visible by going INTO
 * that community's scoped profile (enforces Skool privacy model).
 *
 * The handle param can be either @handle or user id (fallback for users
 * who haven't set a handle yet).
 */
export default async function UserGlobalPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const clean = decodeURIComponent(handle).replace(/^@/, "");

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ handle: clean }, { id: clean }],
    },
    select: {
      id: true,
      name: true,
      handle: true,
      image: true,
      bio: true,
      location: true,
      createdAt: true,
      memberships: {
        include: {
          community: {
            select: { id: true, slug: true, name: true, iconUrl: true, memberCount: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      ownedCommunities: {
        select: { id: true, slug: true, name: true, iconUrl: true, memberCount: true },
      },
    },
  });
  if (!user) notFound();

  const name = user.name || "Ẩn danh";
  const displayHandle = user.handle ?? user.id.slice(0, 8);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-10) var(--space-6)",
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <header style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: "var(--space-6)" }}>
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt=""
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: avatarColorFor(user.id),
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--text-2xl)",
                fontWeight: 800,
              }}
            >
              {initials(name)}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "var(--text-xl)", fontWeight: 700, margin: 0, color: "var(--header-primary)" }}>
              {name}
            </h1>
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              @{displayHandle}
            </div>
            {user.bio && (
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  marginTop: 6,
                  color: "var(--text-normal)",
                }}
              >
                {user.bio}
              </div>
            )}
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginTop: 4,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {user.location && <span>📍 {user.location}</span>}
              <span>Tham gia focus.camp {fmtRelativeTime(user.createdAt)}</span>
            </div>
          </div>
        </header>

        {user.ownedCommunities.length > 0 && (
          <section style={{ marginBottom: "var(--space-6)" }}>
            <h2
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                margin: "0 0 var(--space-2) 0",
              }}
            >
              ★ Chủ cộng đồng ({user.ownedCommunities.length})
            </h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {user.ownedCommunities.map((c) => (
                <CommunityChip key={c.id} community={c} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              margin: "0 0 var(--space-2) 0",
            }}
          >
            Thành viên ({user.memberships.length})
          </h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {user.memberships.map((m) => (
              <CommunityChip key={m.community.id} community={m.community} />
            ))}
          </div>
          {user.memberships.length === 0 && (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Chưa tham gia cộng đồng nào.
            </div>
          )}
        </section>

        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginTop: "var(--space-6)",
            fontStyle: "italic",
          }}
        >
          Level / XP / streak là riêng của từng cộng đồng — click vào community
          bất kỳ để xem profile đầy đủ trong context đó.
        </p>
      </div>
    </div>
  );
}

function CommunityChip({
  community,
}: {
  community: {
    id: string;
    slug: string;
    name: string;
    iconUrl: string | null;
    memberCount: number;
  };
}) {
  return (
    <Link
      href={`/c/${community.slug}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 999,
        textDecoration: "none",
        color: "var(--text-normal)",
        fontSize: "var(--text-sm)",
      }}
    >
      {community.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={community.iconUrl}
          alt=""
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: avatarColorFor(community.id),
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {initials(community.name)}
        </div>
      )}
      <span style={{ fontWeight: 500 }}>{community.name}</span>
      <span style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
        · {community.memberCount}
      </span>
    </Link>
  );
}
