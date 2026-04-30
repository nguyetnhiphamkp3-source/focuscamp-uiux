"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProductFeaturedGlobalAction } from "@/app/actions/marketplace";
import { setCourseFeaturedGlobalAction } from "@/app/actions/course";

export type FeaturedKind = "product" | "course";

export function FeaturedGlobalToggle({
  kind,
  resourceId,
  communitySlug,
  initial,
}: {
  kind: FeaturedKind;
  resourceId: string;
  communitySlug: string;
  initial: boolean;
}) {
  const router = useRouter();
  const [featured, setFeatured] = useState(initial);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    const next = !featured;
    setFeatured(next);
    setErr(null);
    start(async () => {
      const res =
        kind === "product"
          ? await setProductFeaturedGlobalAction({
              productId: resourceId,
              communitySlug,
              featured: next,
            })
          : await setCourseFeaturedGlobalAction({
              courseId: resourceId,
              communitySlug,
              featured: next,
            });
      if (!res.ok) {
        setFeatured(!next);
        setErr(res.reason);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      title={
        featured
          ? "Đang hiện trên Marketplace chung — click để ẩn"
          : "Click để hiện trên Marketplace chung"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${featured ? "var(--brand-green)" : "var(--border-subtle)"}`,
        background: featured ? "rgba(27,158,117,0.1)" : "transparent",
        color: featured ? "var(--brand-green)" : "var(--text-muted)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.6 : 1,
      }}
    >
      🌐 {featured ? "Đang public" : "Hiện global"}
      {err && <span style={{ color: "var(--danger)" }}> · {err}</span>}
    </button>
  );
}
