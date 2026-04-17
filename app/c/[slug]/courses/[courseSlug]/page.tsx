import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fmtDuration } from "@/lib/brand";
import { CreateLessonButton } from "@/components/community/create-lesson-button";
import { CourseSettingsPanel } from "@/components/community/course-settings-panel";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { courseSlug, slug } = await params;

  const session = await auth();
  const course = await prisma.course.findFirst({
    where: { community: { slug }, slug: courseSlug },
    include: {
      lessons: { orderBy: { position: "asc" } },
      community: { select: { id: true, ownerId: true } },
    },
  });
  if (!course) notFound();
  const isOwner = session?.user?.id === course.community.ownerId;

  const activeLesson = course.lessons[0];
  const totalDuration = course.lessons.reduce(
    (s, l) => s + (l.duration ?? 0),
    0
  );
  const totalText = totalDuration
    ? `${Math.floor(totalDuration / 60)} phút`
    : null;

  return (
    <>
      <header className="view-header">
        <span className="view-title">{course.title}</span>
        {course.pillar && (
          <span className="view-subtitle">{course.pillar}</span>
        )}
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {isOwner && (
          <div style={{ padding: "var(--space-4) var(--space-4) 0" }}>
            <CourseSettingsPanel
              courseId={course.id}
              communitySlug={slug}
              courseSlug={courseSlug}
              initial={{
                title: course.title,
                description: course.description,
                level: course.level,
                isPublished: course.isPublished,
                pillar: course.pillar,
                thumbnailUrl: course.thumbnailUrl,
              }}
            />
          </div>
        )}
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "var(--space-6) var(--space-8) var(--space-10)",
          }}
        >
          {/* VIDEO */}
          {activeLesson ? (
            <div
              style={{
                aspectRatio: "16/9",
                background: "#000",
                borderRadius: "var(--r-xl)",
                overflow: "hidden",
                marginBottom: "var(--space-5)",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {activeLesson.videoUrl ? (
                <iframe
                  src={activeLesson.videoUrl}
                  title={activeLesson.title}
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "var(--text-sm)",
                  }}
                >
                  Video chưa được tải lên
                </div>
              )}
            </div>
          ) : null}

          {/* TITLE */}
          <h1
            style={{
              fontSize: "var(--text-xl)",
              marginBottom: "var(--space-2)",
              color: "var(--text-heading)",
              lineHeight: "var(--lh-tight)",
            }}
          >
            {activeLesson?.title || course.title}
          </h1>

          {/* META TAGS */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-2)",
              flexWrap: "wrap",
              marginBottom: "var(--space-5)",
            }}
          >
            {course.pillar && <Tag>🎯 {course.pillar}</Tag>}
            <Tag>
              {course.level === "BASIC"
                ? "📘 Basic"
                : course.level === "ADVANCED"
                  ? "🔥 Advanced"
                  : "📗 Intermediate"}
            </Tag>
            <Tag>📹 {course.lessons.length} bài</Tag>
            {totalText && <Tag>⏱️ {totalText}</Tag>}
            {course.xpReward > 0 && <Tag accent>💎 +{course.xpReward} XP</Tag>}
            {course.aipReward > 0 && (
              <Tag accent>🪙 +{course.aipReward} AIP</Tag>
            )}
          </div>

          {/* DESCRIPTION */}
          {(activeLesson?.description || course.description) && (
            <div
              className="ui-card"
              style={{
                lineHeight: "var(--lh-relaxed)",
                fontSize: "var(--text-base)",
                marginBottom: "var(--space-5)",
              }}
            >
              {activeLesson?.description || course.description}
            </div>
          )}

          {/* LESSON CONTENT (if any) */}
          {activeLesson?.content && (
            <div
              className="ui-card ui-card-lg"
              style={{
                lineHeight: "var(--lh-relaxed)",
                fontSize: "var(--text-base)",
                whiteSpace: "pre-wrap",
              }}
            >
              {activeLesson.content}
            </div>
          )}

          {/* Fallback for no lessons */}
          {course.lessons.length === 0 && !isOwner && (
            <div className="ui-empty">
              <div className="ui-empty-icon">📘</div>
              <div className="ui-empty-title">Chưa có bài học nào</div>
              Khoá học đang được chuẩn bị.
            </div>
          )}

          {/* Admin: add lesson */}
          {isOwner && (
            <CreateLessonButton
              courseId={course.id}
              communitySlug={slug}
              courseSlug={courseSlug}
            />
          )}
        </div>
      </div>
    </>
  );
}

function Tag({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: "4px 10px",
        borderRadius: "var(--r-full)",
        background: accent ? "var(--brand-green-soft)" : "var(--bg-elevated)",
        color: accent ? "var(--brand-green-dark)" : "var(--text-normal)",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--fw-semibold)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {children}
    </span>
  );
}

// Silence unused imports in case Next marks unused fmtDuration
void fmtDuration;
