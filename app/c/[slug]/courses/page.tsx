import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateCourseButton } from "@/components/community/create-course-button";
import { FeaturedGlobalToggle } from "@/components/marketplace/featured-global-toggle";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";

export const dynamic = "force-dynamic";

type CourseFilter = "all" | "in-progress" | "free" | "pro" | "completed";

const COURSE_FILTERS: { key: CourseFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "in-progress", label: "Đang học" },
  { key: "free", label: "Miễn phí" },
  { key: "pro", label: "PRO" },
  { key: "completed", label: "Đã hoàn thành" },
];

const PILLAR_THUMB: Record<string, { cls: string; icon: string }> = {
  Offer: { cls: "p-offer", icon: "🎯" },
  Traffic: { cls: "p-traffic", icon: "📣" },
  Conversion: { cls: "p-conversion", icon: "⚡" },
  Delivery: { cls: "p-delivery", icon: "🚚" },
  USP: { cls: "p-usp", icon: "💎" },
};

function thumbFor(pillar: string | null) {
  if (!pillar) return { cls: "p-offer", icon: "📚" };
  for (const [key, val] of Object.entries(PILLAR_THUMB)) {
    if (pillar.toLowerCase().startsWith(key.toLowerCase())) return val;
  }
  return { cls: "p-offer", icon: "📚" };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFilter(value: string | string[] | undefined): CourseFilter {
  const raw = firstParam(value);
  return COURSE_FILTERS.some((f) => f.key === raw) ? (raw as CourseFilter) : "all";
}

function isProCourse(course: { level: string; requiredTier: string | null }) {
  return (
    course.requiredTier === "PRO" ||
    course.level === "ADVANCED" ||
    course.level === "EXPERT"
  );
}

function progressText(progress: { completed: number; touched: number; total: number }) {
  if (progress.total === 0 || progress.touched === 0) return "Chưa bắt đầu";
  if (progress.completed >= progress.total) return "Đã hoàn thành";
  return `${progress.completed}/${progress.total} bài`;
}

function progressPercent(progress: { completed: number; total: number }) {
  if (progress.total === 0) return 0;
  return Math.round((progress.completed / progress.total) * 100);
}

function filterHref(slug: string, filter: CourseFilter) {
  return filter === "all"
    ? `/c/${slug}/courses`
    : `/c/${slug}/courses?filter=${filter}`;
}

export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const activeFilter = normalizeFilter(query.filter);
  const session = await auth();
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      memberships: session?.user?.id
        ? { where: { userId: session.user.id }, select: { role: true } }
        : false,
      courses: {
        // Course managers see unpublished drafts too; members/guests see only published
        include: {
          lessons: { select: { id: true } },
          _count: { select: { lessons: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!community) notFound();
  const realIsOwner = session?.user?.id === community.ownerId;
  const { effectiveIsOwner: isOwner, previewAsMember } = await getEffectiveOwnership(realIsOwner);
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: previewAsMember
      ? null
      : Array.isArray(community.memberships)
        ? community.memberships[0]?.role
        : null,
  });
  const permissions = communityPermissionFlags(role);
  const visibleCourses = permissions.canManageCourses
    ? community.courses
    : community.courses.filter((c) => c.isPublished);
  const progressByCourse = new Map<
    string,
    { completed: number; touched: number; total: number }
  >();
  const lessonToCourse = new Map<string, string>();

  for (const c of visibleCourses) {
    progressByCourse.set(c.id, {
      completed: 0,
      touched: 0,
      total: c._count.lessons,
    });
    for (const lesson of c.lessons) lessonToCourse.set(lesson.id, c.id);
  }

  if (session?.user?.id && lessonToCourse.size > 0) {
    const rows = await prisma.courseProgress.findMany({
      where: {
        userId: session.user.id,
        lessonId: { in: Array.from(lessonToCourse.keys()) },
      },
      select: { lessonId: true, completed: true },
    });

    for (const row of rows) {
      const courseId = lessonToCourse.get(row.lessonId);
      const progress = courseId ? progressByCourse.get(courseId) : null;
      if (!progress) continue;
      progress.touched += 1;
      if (row.completed) progress.completed += 1;
    }
  }

  const filteredCourses = visibleCourses.filter((c) => {
    const progress = progressByCourse.get(c.id) ?? {
      completed: 0,
      touched: 0,
      total: c._count.lessons,
    };
    const pro = isProCourse(c);
    if (activeFilter === "free") return !pro;
    if (activeFilter === "pro") return pro;
    if (activeFilter === "in-progress") {
      return progress.touched > 0 && progress.completed < progress.total;
    }
    if (activeFilter === "completed") {
      return progress.total > 0 && progress.completed >= progress.total;
    }
    return true;
  });

  return (
    <>
      <header className="view-header">
        <span className="view-title">Khóa học</span>
        <span className="view-subtitle">Hệ thống học tập có lộ trình</span>
      </header>

      <div className="courses-list-wrap">
        <div className="courses-list-inner">
          {permissions.canManageCourses && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "var(--space-4)",
              }}
            >
              <CreateCourseButton
                communityId={community.id}
                communitySlug={slug}
              />
            </div>
          )}
          <div className="cl-filters">
            {COURSE_FILTERS.map((f) => (
              <Link
                key={f.key}
                href={filterHref(slug, f.key)}
                className={`cl-filter ${activeFilter === f.key ? "active" : ""}`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {visibleCourses.length === 0 ? (
            <EmptyState
              icon="📚"
              title="Chưa có khóa học nào"
              description="Community sẽ publish khóa học đầu tiên sớm."
            />
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="Không có kết quả"
              description="Thử chọn bộ lọc khác."
            />
          ) : (
            <div className="cl-grid">
              {filteredCourses.map((c) => {
                const t = thumbFor(c.pillar);
                const isPro = isProCourse(c);
                const progress = progressByCourse.get(c.id) ?? { completed: 0, touched: 0, total: c._count.lessons };
                return (
                  <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <Link
                    href={`/c/${slug}/courses/${c.slug}`}
                    className="course-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className={`course-card-thumb ${t.cls}`}>
                      {c.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.thumbnailUrl}
                          alt={c.title}
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <span className="thumb-icon">{t.icon}</span>
                      )}
                      <span className="course-card-level">
                        {c.level === "BASIC"
                          ? "Basic"
                          : c.level === "ADVANCED"
                            ? "Advanced"
                            : "Intermediate"}
                      </span>
                      {isPro && <span className="course-card-locked">Pro</span>}
                    </div>
                    <div className="course-card-body">
                      {c.pillar && (
                        <div className="course-card-pillar">{c.pillar}</div>
                      )}
                      <div className="course-card-title">{c.title}</div>
                      {c.description && (
                        <div className="course-card-desc">{c.description}</div>
                      )}
                      <div className="course-card-meta">
                        <span>📹 {c._count.lessons} bài</span>
                        {c.xpReward > 0 && (
                          <>
                            <span className="meta-sep">·</span>
                            <span>💎 +{c.xpReward} XP</span>
                          </>
                        )}
                      </div>
                      <div className="course-card-progress">
                        <div className="bar">
                          <div className="fill" style={{ width: `${progressPercent(progress)}%` }} />
                        </div>
                        <span className="pct">{progressText(progress)}</span>
                      </div>
                      <span
                        className={`course-card-cta ${isPro ? "locked" : "primary"}`}
                      >
                        {isPro ? "🔒 Unlock Pro" : "Bắt đầu học"}
                      </span>
                    </div>
                  </Link>
                  {permissions.canManageCourses && (
                    <FeaturedGlobalToggle
                      kind="course"
                      resourceId={c.id}
                      communitySlug={slug}
                      initial={c.featuredOnGlobal}
                    />
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
