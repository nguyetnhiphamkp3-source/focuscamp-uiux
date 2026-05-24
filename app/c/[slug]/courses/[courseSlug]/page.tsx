import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CreateLessonButton } from "@/components/community/create-lesson-button";
import { CourseSettingsPanel } from "@/components/community/course-settings-panel";
import { CourseEditButton } from "@/components/community/challenge-edit-button";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { MarkLessonCompleteButton } from "@/components/community/mark-lesson-complete-button";
import { LockedLessonNotice } from "@/components/community/locked-lesson-notice";
import { MobileLessonScroll } from "@/components/community/mobile-lesson-scroll";
import { checkGate, getTiersConfig } from "@/lib/services/subscription";
import { toEmbedUrl } from "@/lib/brand";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";

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
      community: {
        select: {
          id: true,
          ownerId: true,
          memberships: session?.user?.id
            ? { where: { userId: session.user.id }, select: { role: true } }
            : false,
        },
      },
    },
  });
  if (!course) notFound();
  const realIsOwner = session?.user?.id === course.community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: Array.isArray(course.community.memberships)
      ? course.community.memberships[0]?.role
      : null,
  });
  const permissions = communityPermissionFlags(role);

  if (!course.isPublished && !permissions.canManageCourses) notFound();

  // Parallel: tier-gate check + lesson completion lookup.
  // Note: when gated, completedSet is wasted, but the gate query is rare and
  // the speedup on the common path is worth the speculative fetch.
  const [courseGateBlock, completedSet] = await Promise.all([
    // Tier gate for non-BASIC courses (always bypass for real owner)
    (async (): Promise<{ message: string; requiredTier: string } | null> => {
      if (!session?.user?.id || realIsOwner || course.level === "BASIC") return null;
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
      if (gateResult.allowed) return null;
      return { message: gateResult.message, requiredTier: gateResult.requiredTier };
    })(),
    // Completion lookup for ALL lessons (needed for sequential locking)
    session?.user?.id && course.lessons.length > 0
      ? prisma.courseProgress.findMany({
          where: {
            userId: session.user.id,
            lessonId: { in: course.lessons.map((l) => l.id) },
            completed: true,
          },
          select: { lessonId: true },
        }).then((rows) => new Set(rows.map((r) => r.lessonId)))
      : Promise.resolve(new Set<string>()),
  ]);

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

  const activeLessonCompleted = activeLesson ? completedSet.has(activeLesson.id) : false;

  // Sequential locking: lesson is locked if the previous lesson is not completed
  // First lesson is always unlocked; course managers bypass locking
  let isLocked = false;
  if (activeLesson && !permissions.canManageCourses) {
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
        {permissions.canManageCourses && <CourseEditButton />}
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        {permissions.canManageCourses && (
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

          {/* MOBILE LESSON NAV — pill bar + prev/next, visible only < 1024px */}
          {course.lessons.length > 1 && (() => {
            const activeIdx = course.lessons.findIndex((l) => l.id === activeLesson?.id);
            const prevLesson = activeIdx > 0 ? course.lessons[activeIdx - 1] : null;
            const nextLesson = activeIdx < course.lessons.length - 1 ? course.lessons[activeIdx + 1] : null;
            return (
              <div className="mobile-lesson-list" style={{ marginBottom: "var(--space-4)" }}>
                <MobileLessonScroll />
                {/* Pill bar */}
                <div className="mobile-lesson-pills">
                  {course.lessons.map((l, i) => {
                    const isActive = activeLesson?.id === l.id;
                    const isCompleted = completedSet.has(l.id);
                    return (
                      <a
                        key={l.id}
                        href={`/c/${slug}/courses/${courseSlug}?lessonId=${l.id}`}
                        className={`mobile-lesson-pill${isActive ? " active" : ""}${isCompleted ? " completed" : ""}`}
                        title={l.title}
                      >
                        {isCompleted ? "✓" : i + 1}
                      </a>
                    );
                  })}
                </div>
                {/* Prev / Next */}
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                  {prevLesson ? (
                    <a
                      href={`/c/${slug}/courses/${courseSlug}?lessonId=${prevLesson.id}`}
                      className="mobile-lesson-nav-btn"
                    >
                      ← Bài trước
                    </a>
                  ) : (
                    <span className="mobile-lesson-nav-btn disabled">← Bài trước</span>
                  )}
                  <span style={{ flex: 1, textAlign: "center", fontSize: "var(--text-xs)", color: "var(--text-muted)", alignSelf: "center" }}>
                    Bài {activeIdx + 1}/{course.lessons.length}
                  </span>
                  {nextLesson ? (
                    <a
                      href={`/c/${slug}/courses/${courseSlug}?lessonId=${nextLesson.id}`}
                      className="mobile-lesson-nav-btn"
                    >
                      Bài tiếp →
                    </a>
                  ) : (
                    <span className="mobile-lesson-nav-btn disabled">Bài tiếp →</span>
                  )}
                </div>
              </div>
            );
          })()}

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
          {!isLocked && session?.user?.id && activeLesson && !permissions.canManageCourses && (
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
          {course.lessons.length === 0 && !permissions.canManageCourses && (
            <div className="ui-empty">
              <div className="ui-empty-icon">📘</div>
              <div className="ui-empty-title">Chưa có bài học nào</div>
              Khoá học đang được chuẩn bị.
            </div>
          )}

          {/* Admin: add lesson */}
          {permissions.canManageCourses && (
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
