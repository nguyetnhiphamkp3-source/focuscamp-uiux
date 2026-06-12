import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPostDetail } from "@/lib/feed-detail";
import { PostDetailView } from "@/components/feed/post-detail-view";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const data = await loadPostDetail(slug, postId);
  if (!data) notFound();

  const isQuestion = data.post.type === "QUESTION";
  const backHref = isQuestion
    ? `/c/${slug}/qa`
    : data.post.type === "SIGNAL"
      ? `/c/${slug}/signals`
      : `/c/${slug}/feed`;

  return (
    <>
      <header className="view-header">
        <Link
          href={backHref}
          style={{ fontSize: "var(--text-sm)", color: "var(--interactive-normal)", textDecoration: "none" }}
        >
          ← Quay lại
        </Link>
        <span className="view-title" style={{ marginLeft: 12 }}>
          {isQuestion ? "Câu hỏi" : data.post.type === "SIGNAL" ? "Tín hiệu" : "Bài viết"}
        </span>
      </header>

      <div className="feed-view">
        <div className="feed-inner">
          <PostDetailView data={data} />
        </div>
      </div>
    </>
  );
}
