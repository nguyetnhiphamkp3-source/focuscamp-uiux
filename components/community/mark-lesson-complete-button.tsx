"use client";

import { useState, useTransition } from "react";
import { markLessonCompleteAction } from "@/app/actions/course";

export function MarkLessonCompleteButton({
  lessonId,
  communitySlug,
  courseSlug,
  initialCompleted,
}: {
  lessonId: string;
  communitySlug: string;
  courseSlug: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !completed;
      const res = await markLessonCompleteAction({
        lessonId,
        communitySlug,
        courseSlug,
        completed: next,
      });
      if (res.ok) setCompleted(next);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`mark-complete-btn ${completed ? "completed" : ""}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "10px 20px",
        borderRadius: "var(--r-lg)",
        border: "none",
        background: completed ? "var(--brand-green-soft)" : "var(--brand-green)",
        color: completed ? "var(--brand-green-dark)" : "#fff",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--fw-semibold)",
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.7 : 1,
        transition: "all 0.15s ease",
      }}
    >
      {completed ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
    </button>
  );
}
