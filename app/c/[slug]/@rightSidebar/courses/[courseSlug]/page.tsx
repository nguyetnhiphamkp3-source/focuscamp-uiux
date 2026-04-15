import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CoursePlaylistSidebar({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;
  const course = await prisma.course.findFirst({
    where: { community: { slug }, slug: courseSlug },
    include: { lessons: { orderBy: { position: "asc" } } },
  });
  if (!course) notFound();

  return (
    <aside className="right-sidebar">
      <div
        style={{
          padding: "var(--space-5) var(--space-5) var(--space-3)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            fontWeight: "var(--fw-semibold)",
            marginBottom: "var(--space-2)",
          }}
        >
          Nội dung khoá học
        </div>
        <div
          style={{
            fontSize: "var(--text-md)",
            fontWeight: "var(--fw-bold)",
            color: "var(--text-heading)",
            lineHeight: "var(--lh-snug)",
            marginBottom: "var(--space-1)",
          }}
        >
          {course.title}
        </div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {course.lessons.length} bài
          {course.xpReward ? ` · +${course.xpReward} XP` : ""}
        </div>
      </div>

      <div style={{ padding: "var(--space-3)" }}>
        {course.lessons.map((l, i) => {
          const isActive = i === 0;
          return (
            <div
              key={l.id}
              style={{
                display: "flex",
                gap: "var(--space-3)",
                padding: "var(--space-3)",
                borderRadius: "var(--r-md)",
                background: isActive ? "var(--bg-modifier-active)" : "transparent",
                marginBottom: "var(--space-1)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "var(--r-full)",
                  background: isActive
                    ? "var(--brand-green)"
                    : "var(--bg-elevated)",
                  color: isActive ? "#fff" : "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--text-xs)",
                  fontWeight: "var(--fw-bold)",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: isActive ? "var(--fw-bold)" : "var(--fw-medium)",
                    color: "var(--text-heading)",
                    lineHeight: "var(--lh-snug)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {l.title}
                </div>
                <div
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {fmtDuration(l.duration)}
                  {l.xpReward ? ` · +${l.xpReward} XP` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
