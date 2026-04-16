import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateCourseButton } from "@/components/community/create-course-button";

export const dynamic = "force-dynamic";

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

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const community = await prisma.community.findUnique({
    where: { slug },
    include: {
      courses: {
        // Owners see unpublished drafts too; members/guests see only published
        include: { _count: { select: { lessons: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!community) notFound();
  const isOwner = session?.user?.id === community.ownerId;
  const visibleCourses = isOwner
    ? community.courses
    : community.courses.filter((c) => c.isPublished);

  return (
    <>
      <header className="view-header">
        <span className="view-title">Khóa học</span>
        <span className="view-subtitle">Hệ thống học tập có lộ trình</span>
      </header>

      <div className="courses-list-wrap">
        <div className="courses-list-inner">
          {isOwner && (
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
            <div className="cl-filter active">Tất cả</div>
            <div className="cl-filter">Đang học</div>
            <div className="cl-filter">Miễn phí</div>
            <div className="cl-filter">PRO</div>
            <div className="cl-filter">Đã hoàn thành</div>
          </div>

          {visibleCourses.length === 0 ? (
            <EmptyState
              icon="📚"
              title="Chưa có khóa học nào"
              description="Community sẽ publish khóa học đầu tiên sớm."
            />
          ) : (
            <div className="cl-grid">
              {visibleCourses.map((c) => {
                const t = thumbFor(c.pillar);
                const isPro =
                  c.requiredTier === "PRO" || c.level === "ADVANCED";
                return (
                  <Link
                    key={c.id}
                    href={`/c/${slug}/courses/${c.slug}`}
                    className="course-card"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div className={`course-card-thumb ${t.cls}`}>
                      <span className="thumb-icon">{t.icon}</span>
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
                          <div className="fill" style={{ width: "0%" }} />
                        </div>
                        <span className="pct">Chưa bắt đầu</span>
                      </div>
                      <span
                        className={`course-card-cta ${isPro ? "locked" : "primary"}`}
                      >
                        {isPro ? "🔒 Unlock Pro" : "Bắt đầu học"}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
