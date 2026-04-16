import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtDuration, ytThumb } from "@/lib/brand";

export const dynamic = "force-dynamic";

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
      {/* Header */}
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

      {/* Playlist */}
      <div
        style={{
          padding: "var(--space-2) var(--space-3)",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {course.lessons.map((l, i) => {
          const isActive = i === 0;
          const thumb = ytThumb(l.videoUrl);
          const dur = fmtDuration(l.duration);
          return (
            <div
              key={l.id}
              style={{
                display: "flex",
                gap: "var(--space-3)",
                padding: "var(--space-2)",
                borderRadius: "var(--r-md)",
                background: isActive
                  ? "var(--bg-modifier-active)"
                  : "transparent",
                marginBottom: "var(--space-1)",
                cursor: "pointer",
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 120,
                  aspectRatio: "16/9",
                  borderRadius: "var(--r-md)",
                  overflow: "hidden",
                  flexShrink: 0,
                  position: "relative",
                  background: "var(--bg-elevated)",
                }}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={l.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--text-muted)",
                      fontSize: "var(--text-xl)",
                    }}
                  >
                    📹
                  </div>
                )}
                {/* Order badge (top-left) */}
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    background: "rgba(0,0,0,0.75)",
                    color: "#fff",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--fw-bold)",
                    padding: "1px 6px",
                    borderRadius: "var(--r-sm)",
                    lineHeight: 1.4,
                    minWidth: 20,
                    textAlign: "center",
                  }}
                >
                  {i + 1}
                </div>
                {/* Duration badge (bottom-right) */}
                {dur && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      background: "rgba(0,0,0,0.75)",
                      color: "#fff",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--fw-semibold)",
                      padding: "1px 4px",
                      borderRadius: "var(--r-sm)",
                      lineHeight: 1.4,
                    }}
                  >
                    {dur}
                  </div>
                )}
                {/* Active indicator */}
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.35)",
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--r-full)",
                        background: "rgba(255,255,255,0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: "10px solid var(--text-heading)",
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          marginLeft: 2,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: isActive
                      ? "var(--fw-bold)"
                      : "var(--fw-medium)",
                    color: "var(--text-heading)",
                    lineHeight: "var(--lh-snug)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {l.title}
                </div>
                {l.xpReward > 0 && (
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      lineHeight: "var(--lh-normal)",
                    }}
                  >
                    +{l.xpReward} XP
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
