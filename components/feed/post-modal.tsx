"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/** Facebook-style modal: dims the feed and shows the post + comments. Closes
 *  on backdrop click / Esc / ✕ by navigating back to the underlying page. */
export function PostModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="post-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="post-modal-card" role="dialog" aria-modal="true">
        <button className="post-modal-close" onClick={close} aria-label="Đóng" title="Đóng">
          <X size={18} />
        </button>
        <div className="post-modal-body">{children}</div>
      </div>
    </div>
  );
}
