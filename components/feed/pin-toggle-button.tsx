"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePinAction } from "@/app/actions/posts";

export function PinToggleButton({
  postId,
  communitySlug,
  initialIsPinned,
}: {
  postId: string;
  communitySlug: string;
  initialIsPinned: boolean;
}) {
  const router = useRouter();
  const [isPinned, setIsPinned] = useState(initialIsPinned);
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const res = await togglePinAction({ postId, communitySlug });
      if (res.ok && res.data) {
        setIsPinned(res.data.isPinned);
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
      title={isPinned ? "Bỏ ghim bài" : "Ghim bài lên đầu feed"}
      style={{
        color: isPinned ? "var(--brand-green)" : undefined,
        fontWeight: isPinned ? 700 : undefined,
      }}
    >
      {isPinned ? "📌 Đã ghim" : "📌 Ghim"}
    </button>
  );
}
