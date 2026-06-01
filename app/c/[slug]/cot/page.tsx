import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { getPillars, getCurrency } from "@/lib/community-config";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/ui/empty-state";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";
import { Star } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      ownerId: true,
      pillarsConfig: true,
      gemsConfig: true,
    },
  });
  if (!community) notFound();

  const pillars = getPillars(community);
  const currency = getCurrency(community);

  const session = await auth();
  const userId = session?.user?.id;
  const realIsOwner = userId === community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);
  const membership = userId
    ? await prisma.membership.findUnique({
        where: { userId_communityId: { userId, communityId: community.id } },
        select: { role: true },
      })
    : null;
  const role = effectiveCommunityRole({ isOwner, membershipRole: membership?.role });
  const permissions = communityPermissionFlags(role);

  const PAGE_SIZE = 20;
  const posts = await listFeed({
    communityId: community.id,
    type: "POST",
    isCot: true,
    userId,
    limit: PAGE_SIZE,
  });

  return (
    <>
      <header className="view-header">
        <span className="view-title">CỐT</span>
        <span className="view-subtitle">
          Các bài viết cốt lõi, chất lượng cao do admin đánh dấu
        </span>
      </header>
      <div className="feed-view">
        <div className="feed-inner">
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "16px 20px",
              background:
                "linear-gradient(135deg, rgba(240,179,50,0.12), rgba(235,69,158,0.08))",
              border: "1px solid rgba(240,179,50,0.3)",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <Star size={28} color="var(--premium-gold)" strokeWidth={1.5} />
            <div>
              <div
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--premium-gold)",
                }}
              >
                Bộ sưu tập CỐT
              </div>
              <div
                style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
              >
                {posts.length} bài · admin đánh dấu từ Bảng tin bằng nút “☆ Mark CỐT”.
              </div>
            </div>
          </div>

          {posts.length === 0 ? (
            <EmptyState
              icon={<Star size={40} color="var(--premium-gold)" strokeWidth={1.5} />}
              title="Chưa có bài CỐT nào"
              description={
                permissions.canModerateContent
                  ? "Vào Bảng tin, bấm “☆ Mark CỐT” dưới bài viết chất lượng để đưa về đây."
                  : "Admin cộng đồng sẽ đánh dấu những bài xuất sắc từ Bảng tin. Quay lại sau nhé!"
              }
            />
          ) : (
            <FeedList
              initialPosts={posts}
              communityId={community.id}
              communitySlug={slug}
              type="POST"
              pillars={pillars}
              currency={currency}
              isOwner={permissions.canModerateContent}
              currentUserId={userId ?? null}
              pageSize={PAGE_SIZE}
              showCotBadge={false}
              filter={{ isCot: true }}
            />
          )}
        </div>
      </div>
    </>
  );
}
