import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { PostComposer } from "@/components/feed/post-composer";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function SignalsPage({
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

  const signals = await listFeed({
    communityId: community.id,
    type: "SIGNAL",
    userId,
    limit: 50,
  });

  return (
    <>
      <header className="view-header">
        <span className="view-title">Tín hiệu</span>
        <span className="view-subtitle">
          Insight nhanh, trend, cơ hội mới — cập nhật liên tục
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
                "linear-gradient(135deg, rgba(88,101,242,0.12), rgba(0,168,252,0.08))",
              border: "1px solid rgba(88,101,242,0.3)",
              borderRadius: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 28 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--info)",
                }}
              >
                Market Pulse
              </div>
              <div
                style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
              >
                {signals.length} tín hiệu · admin cộng đồng đăng các insight nhanh.
                AI Agent sẽ tự động tổng hợp thêm (coming soon).
              </div>
            </div>
          </div>

          {/* Admin-only composer */}
          {isOwner && session?.user && userId && (
            <PostComposer
              communityId={community.id}
              communitySlug={slug}
              type="SIGNAL"
              user={{
                id: userId,
                name: session.user.name ?? null,
                image: session.user.image ?? null,
              }}
              placeholder="Insight / trend / cơ hội nhanh (1-3 câu)…"
              showTitle={false}
              showPillar={true}
            />
          )}

          {signals.length === 0 ? (
            <EmptyState
              icon="⚡"
              title="Chưa có tín hiệu nào"
              description={
                isOwner
                  ? "Đăng tín hiệu đầu tiên cho cộng đồng — trend, cơ hội mới, market pulse…"
                  : "Admin cộng đồng sẽ đăng các tín hiệu mới ở đây. Quay lại sau nhé!"
              }
            />
          ) : (
            signals.map((s) => (
              <PostCard
                key={s.id}
                post={s}
                communitySlug={slug}
                canEditCot={isOwner}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
