"use client";

import { useState, useTransition } from "react";
import { toggleCotAction } from "@/app/actions/posts";
import { useRouter } from "next/navigation";

export function CotToggleButton({
  postId,
  communitySlug,
  initialIsCot,
}: {
  postId: string;
  communitySlug: string;
  initialIsCot: boolean;
}) {
  const router = useRouter();
  const [isCot, setIsCot] = useState(initialIsCot);
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await toggleCotAction({ postId, communitySlug });
      if (res.ok && res.data) {
        setIsCot(res.data.isCot);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      className="feed-post-action"
      onClick={toggle}
      disabled={pending}
      title={isCot ? "Bỏ đánh dấu CỐT" : "Đánh dấu bài chất lượng cao (CỐT)"}
      style={{
        color: isCot ? "var(--premium-gold)" : undefined,
        fontWeight: isCot ? 700 : undefined,
      }}
    >
      {isCot ? "⭐ CỐT" : "☆ Mark CỐT"}
    </button>
  );
}
