import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtDuration, ytThumb } from "@/lib/brand";
import { EditLessonButton } from "@/components/community/edit-lesson-button";

export const dynamic = "force-dynamic";

export default async function CoursePlaylistSidebar({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const { slug, courseSlug } = await params;
  const { lessonId } = await searchParams;
  const session = await auth();
  const course = await prisma.course.findFirst({
    where: { community: { slug }, slug: courseSlug },
    include: {
      lessons: { orderBy: { position: "asc" } },
      community: { select: { ownerId: true } },
    },
  });
  if (!course) notFound();
  const isOwner = session?.user?.id === course.community.ownerId;

  // Query completion status for all lessons
  const completedSet = new Set<string>();
  if (session?.user?.id && course.lessons.length > 0) {
    const rows = await prisma.courseProgress.findMany({
      where: {
        userId: session.user.id,
        lessonId: { in: course.lessons.map((l) => l.id) },
        completed: true,
      },
      select: { lessonId: true },
    });
    for (const r of rows) completedSet.add(r.lessonId);
  }
  const completedCount = completedSet.size;

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
          {completedCount > 0 && ` · ${completedCount}/${course.lessons.length} hoàn thành`}
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
          const isActive = lessonId ? l.id === lessonId : i === 0;
          const isCompleted = completedSet.has(l.id);
          const isLessonLocked = !isOwner && i > 0 && !completedSet.has(course.lessons[i - 1].id);
          const thumb = ytThumb(l.videoUrl);
          const dur = fmtDuration(l.duration);
          return (
            <Link
              key={l.id}
              href={`/c/${slug}/courses/${courseSlug}?lessonId=${l.id}`}
              style={{
                display: "flex",
                gap: "var(--space-3)",
                padding: "var(--space-2)",
                borderRadius: "var(--r-md)",
                background: isActive
                  ? "var(--bg-modifier-active)"
                  : "transparent",
                marginBottom: "var(--space-1)",
                textDecoration: "none",
                color: "inherit",
                opacity: isLessonLocked ? 0.5 : 1,
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
                    background: isCompleted ? "var(--brand-green)" : isLessonLocked ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.75)",
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
                  {isCompleted ? "✓" : isLessonLocked ? "🔒" : i + 1}
                </div>
                {/* Duration badge (bottom-right) — hide when no real duration */}
                {dur && dur !== "—" && (
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
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="var(--text-heading)" style={{ marginLeft: 1 }}>
                        <path d="M0 0v14l12-7z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-1)",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
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
                  {isOwner && (
                    <EditLessonButton
                      lesson={l}
                      communitySlug={slug}
                      courseSlug={courseSlug}
                    />
                  )}
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
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
