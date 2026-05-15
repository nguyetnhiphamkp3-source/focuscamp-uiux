import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateLessonButton } from "@/components/community/create-lesson-button";
import { CourseSettingsPanel } from "@/components/community/course-settings-panel";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { MarkLessonCompleteButton } from "@/components/community/mark-lesson-complete-button";
import { LockedLessonNotice } from "@/components/community/locked-lesson-notice";
import { checkGate, getTiersConfig } from "@/lib/services/subscription";
import { toEmbedUrl } from "@/lib/brand";
import { getEffectiveOwnership } from "@/lib/preview-mode";

export const dynamic = "force-dynamic";

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const { courseSlug, slug } = await params;
  const { lessonId } = await searchParams;

  const session = await auth();
  const course = await prisma.course.findFirst({
    where: { community: { slug }, slug: courseSlug },
    include: {
      lessons: { orderBy: { position: "asc" } },
      community: { select: { id: true, ownerId: true } },
    },
  });
  if (!course) notFound();
  const realIsOwner = session?.user?.id === course.community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);

  // Tier gate for non-BASIC courses (always bypass for real owner)
  let courseGateBlock: { message: string; requiredTier: string } | null = null;
  if (
    session?.user?.id &&
    !realIsOwner &&
    course.level !== "BASIC"
  ) {
    const communityFull = await prisma.community.findUnique({
      where: { id: course.community.id },
      select: { tiersConfig: true },
    });
    const tiersConfig = getTiersConfig(communityFull?.tiersConfig);
    const gateResult = await checkGate({
      userId: session.user.id,
      communityId: course.community.id,
      tiersConfig,
      check: { type: "course_level", level: course.level },
    });
    if (!gateResult.allowed) {
      courseGateBlock = {
        message: gateResult.message,
        requiredTier: gateResult.requiredTier,
      };
    }
  }

  // If gated, show upgrade prompt instead of content
  if (courseGateBlock) {
    return (
      <>
        <header className="view-header">
          <span className="view-title">{course.title}</span>
          <span className="view-subtitle">🔒 Yêu cầu nâng cấp</span>
        </header>
        <UpgradePrompt
          message={courseGateBlock.message}
          requiredTier={courseGateBlock.requiredTier}
          communitySlug={slug}
        />
      </>
    );
  }

  const activeLesson = (lessonId && course.lessons.find((l) => l.id === lessonId)) || course.lessons[0];
  const totalDuration = course.lessons.reduce(
    (s, l) => s + (l.duration ?? 0),
    0
  );
  const totalText = totalDuration
    ? `${Math.floor(totalDuration / 60)} phút`
    : null;

  // Query completion for ALL lessons (needed for sequential locking)
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

  const activeLessonCompleted = activeLesson ? completedSet.has(activeLesson.id) : false;

  // Sequential locking: lesson is locked if the previous lesson is not completed
  // First lesson is always unlocked; owners bypass locking
  let isLocked = false;
  if (activeLesson && !isOwner) {
    const idx = course.lessons.findIndex((l) => l.id === activeLesson.id);
    if (idx > 0) {
      const prevLesson = course.lessons[idx - 1];
      isLocked = !completedSet.has(prevLesson.id);
    }
  }

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
          {/* Locked notice */}
          {isLocked && <LockedLessonNotice />}

          {/* VIDEO */}
          {activeLesson && !isLocked ? (
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
                  src={toEmbedUrl(activeLesson.videoUrl) ?? activeLesson.videoUrl}
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
          {!isLocked && (activeLesson?.description || course.description) && (
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
          {!isLocked && activeLesson?.content && (
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

          {/* Mark lesson complete */}
          {!isLocked && session?.user?.id && activeLesson && !isOwner && (
            <div style={{ marginTop: "var(--space-5)" }}>
              <MarkLessonCompleteButton
                lessonId={activeLesson.id}
                communitySlug={slug}
                courseSlug={courseSlug}
                initialCompleted={activeLessonCompleted}
              />
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
