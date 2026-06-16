import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { avatarColorFor, initials, fmtRelativeTime } from "@/lib/brand";
import { followCounts, isFollowing } from "@/lib/services/follow";
import { resolveUserHandleParam, userProfilePath } from "@/lib/services/user";
import { FollowButton } from "@/components/profile/follow-button";
import { EditProfileButton } from "@/components/profile/edit-profile-modal";

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
  const now = new Date();
  const { handle } = await params;
  const resolved = await resolveUserHandleParam(handle);
  if (!resolved) notFound();
  if (resolved.shouldRedirect) redirect(userProfilePath(resolved));

  const user = await prisma.user.findUnique({
    where: { id: resolved.userId },
    select: {
      id: true,
      name: true,
      handle: true,
      image: true,
      bio: true,
      location: true,
      createdAt: true,
      memberships: {
        where: {
          community: {
            OR: [
              { planExpiresAt: { gte: now } },
              { planTier: "GRANDFATHER" },
            ],
          },
        },
        include: {
          community: {
            select: { id: true, slug: true, name: true, iconUrl: true, bannerUrl: true, memberCount: true },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
      ownedCommunities: {
        where: {
          OR: [
            { planExpiresAt: { gte: now } },
            { planTier: "GRANDFATHER" },
          ],
        },
        select: { id: true, slug: true, name: true, iconUrl: true, bannerUrl: true, memberCount: true },
      },
    },
  });
  if (!user) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  const isSelf = viewerId === user.id;
  const [counts, viewerIsFollowing, purchases] = await Promise.all([
    followCounts(user.id),
    viewerId && !isSelf ? isFollowing(viewerId, user.id) : Promise.resolve(false),
    isSelf
      ? prisma.purchase.findMany({
          where: { userId: user.id, status: "COMPLETED" },
          select: {
            id: true,
            amountVnd: true,
            createdAt: true,
            product: {
              select: {
                title: true,
                slug: true,
                community: { select: { slug: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const name = user.name || "Ẩn danh";
  const displayHandle = user.handle ?? user.id.slice(0, 8);
  const profileKey = user.handle ?? user.id;

  // Merge: owned (starred) + member-only
  const ownedIds = new Set(user.ownedCommunities.map((c) => c.id));
  const memberOnly = user.memberships.map((m) => m.community).filter((c) => !ownedIds.has(c.id));
  const allCommunities = [
    ...user.ownedCommunities.map((c) => ({ ...c, isOwner: true })),
    ...memberOnly.map((c) => ({ ...c, isOwner: false })),
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-8) var(--space-6)" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        {/* Header card */}
        <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: "24px", marginBottom: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: avatarColorFor(user.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--text-xl)", fontWeight: 800, flexShrink: 0 }}>
                {initials(name)}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div>
                  <h1 style={{ fontSize: "var(--text-lg)", fontWeight: 700, margin: 0, color: "var(--header-primary)" }}>{name}</h1>
                  <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>@{displayHandle}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!isSelf && viewerId && <FollowButton targetUserId={user.id} initialFollowing={viewerIsFollowing} variant="compact" />}
                  {isSelf && <EditProfileButton initial={{ name: user.name, handle: user.handle, bio: user.bio, location: user.location, image: user.image, userId: user.id }} />}
                </div>
              </div>
              {user.bio && <div style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", marginTop: 8, lineHeight: 1.6 }}>{user.bio}</div>}
              <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: "var(--text-sm)", flexWrap: "wrap" }}>
                <Link href={`/u/${profileKey}/followers`} style={{ color: "inherit", textDecoration: "none" }}>
                  <strong style={{ color: "var(--header-primary)" }}>{counts.followers}</strong>
                  <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>Followers</span>
                </Link>
                <Link href={`/u/${profileKey}/following`} style={{ color: "inherit", textDecoration: "none" }}>
                  <strong style={{ color: "var(--header-primary)" }}>{counts.following}</strong>
                  <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>Following</span>
                </Link>
                <span>
                  <strong style={{ color: "var(--header-primary)" }}>{allCommunities.length}</strong>
                  <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>Cộng đồng</span>
                </span>
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 8 }}>
                {user.location && <span style={{ marginRight: 10 }}>📍 {user.location}</span>}
                Tham gia {fmtRelativeTime(user.createdAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Communities */}
        {allCommunities.length > 0 && (
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: "20px 24px", marginBottom: 12, border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Cộng đồng ({allCommunities.length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
              {allCommunities.map((c) => (
                <CommunityCard key={c.id} community={c} isOwner={c.isOwner} />
              ))}
            </div>
          </div>
        )}

        {/* Purchases — self only, non-empty */}
        {isSelf && purchases.length > 0 && (
          <div style={{ background: "var(--bg-card)", borderRadius: 16, padding: "20px 24px", border: "1px solid rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              Đơn mua ({purchases.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {purchases.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < purchases.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/c/${p.product.community.slug}/marketplace/${p.product.slug}`} style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--header-primary)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                      {p.product.title}
                    </Link>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                      {new Date(p.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "#1B9E75", whiteSpace: "nowrap" }}>
                    {Number(p.amountVnd) === 0 ? "Miễn phí" : `${Number(p.amountVnd).toLocaleString("vi-VN")}đ`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function CommunityCard({ community, isOwner }: { community: { id: string; slug: string; name: string; iconUrl: string | null; bannerUrl: string | null; memberCount: number }; isOwner: boolean }) {
  const banner = community.bannerUrl ?? `https://picsum.photos/seed/${community.id}/400/160`;
  return (
    <Link href={`/c/${community.slug}`} style={{ display: "block", borderRadius: 12, overflow: "hidden", textDecoration: "none", background: "var(--bg-elevated)", border: "1px solid rgba(0,0,0,0.05)" }}>
      {/* Thumbnail */}
      <div style={{ width: "100%", aspectRatio: "5/2", backgroundImage: `url("${banner}")`, backgroundSize: "cover", backgroundPosition: "center" }} />
      {/* Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}>
        {community.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={community.iconUrl} alt="" style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: avatarColorFor(community.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {initials(community.name)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--header-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {community.name}
            {isOwner && <span style={{ marginLeft: 4, color: "#1B9E75" }}>★</span>}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{community.memberCount} thành viên</div>
        </div>
      </div>
    </Link>
  );
}
