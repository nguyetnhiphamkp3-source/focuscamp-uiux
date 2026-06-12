import { notFound } from "next/navigation";
import { loadPostDetail } from "@/lib/feed-detail";
import { PostDetailView } from "@/components/feed/post-detail-view";
import { PostModal } from "@/components/feed/post-modal";

export const dynamic = "force-dynamic";

/** Intercepts /c/[slug]/p/[postId] when navigated from within the community,
 *  showing the post in a Facebook-style modal. Direct visit / refresh falls
 *  through to the full page. */
export default async function PostModalRoute({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { slug, postId } = await params;
  const data = await loadPostDetail(slug, postId);
  if (!data) notFound();

  return (
    <PostModal>
      <PostDetailView data={data} />
    </PostModal>
  );
}
