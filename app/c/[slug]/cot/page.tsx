import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function CotPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const community = await prisma.community.findUnique({
    where: { slug },
    select: { id: true, name: true, ownerId: true },
  });
  if (!community) notFound();

  const session = await auth();
  const userId = session?.user?.id;
  const isOwner = userId === community.ownerId;

  const posts = await listFeed({
    communityId: community.id,
    type: "POST",
    isCot: true,
    userId,
    limit: 50,
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
            <div style={{ fontSize: 28 }}>⭐</div>
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
              icon="⭐"
              title="Chưa có bài CỐT nào"
              description={
                isOwner
                  ? "Vào Bảng tin, bấm “☆ Mark CỐT” dưới bài viết chất lượng để đưa về đây."
                  : "Admin cộng đồng sẽ đánh dấu những bài xuất sắc từ Bảng tin. Quay lại sau nhé!"
              }
            />
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                communitySlug={slug}
                canEditCot={isOwner}
                showCotBadge={false}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
