import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listFeed } from "@/lib/services/post";
import { PostComposer } from "@/components/feed/post-composer";
import { PostCard } from "@/components/feed/post-card";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function QAPage({
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

  const isMember = userId
    ? !!(await prisma.membership.findUnique({
        where: { userId_communityId: { userId, communityId: community.id } },
      }))
    : false;

  const questions = await listFeed({
    communityId: community.id,
    type: "QUESTION",
    userId,
    limit: 30,
  });

  const unanswered = questions.filter((q) => q.commentCount === 0).length;

  return (
    <>
      <header className="view-header">
        <span className="view-title">Hỏi đáp</span>
        <span className="view-subtitle">
          Đặt câu hỏi, nhận câu trả lời từ cộng đồng
        </span>
      </header>
      <div className="feed-view">
        <div className="feed-inner">
          {isMember && session?.user && userId ? (
            <PostComposer
              communityId={community.id}
              communitySlug={slug}
              type="QUESTION"
              user={{
                id: userId,
                name: session.user.name ?? null,
                image: session.user.image ?? null,
              }}
              placeholder="Câu hỏi của bạn là gì? Nêu rõ bối cảnh để dễ trả lời hơn…"
              showTitle={true}
              showPillar={false}
            />
          ) : (
            <div
              className="feed-compose"
              style={{
                justifyContent: "center",
                color: "var(--text-muted)",
                fontSize: "var(--text-sm)",
              }}
            >
              {userId
                ? "Tham gia cộng đồng để đặt câu hỏi"
                : "Đăng nhập để đặt câu hỏi"}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "14px 18px",
              marginBottom: 18,
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
            }}
          >
            <div>
              <strong style={{ color: "var(--header-primary)" }}>
                {questions.length}
              </strong>{" "}
              câu hỏi
            </div>
            <div>
              <strong style={{ color: "var(--danger)" }}>{unanswered}</strong> chưa
              trả lời
            </div>
          </div>

          {questions.length === 0 ? (
            <EmptyState
              icon="❓"
              title="Chưa có câu hỏi nào"
              description={
                isMember
                  ? "Hãy là người đầu tiên đặt câu hỏi. Cộng đồng sẽ trả lời giúp bạn!"
                  : "Đang chờ câu hỏi đầu tiên."
              }
            />
          ) : (
            questions.map((q) => (
              <PostCard
                key={q.id}
                post={q}
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
