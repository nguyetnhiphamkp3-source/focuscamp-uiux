import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; courseSlug: string }>;
}) {
  const { slug, courseSlug } = await params;

  const course = await prisma.course.findFirst({
    where: { community: { slug }, slug: courseSlug },
    include: {
      lessons: { orderBy: { position: "asc" } },
    },
  });
  if (!course) notFound();

  const firstLesson = course.lessons[0];
  const totalDuration = course.lessons.reduce(
    (s, l) => s + (l.duration ?? 0),
    0
  );
  const totalDurationText = `${Math.floor(totalDuration / 60)} phút`;

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
          padding: "var(--space-6) var(--space-8)",
        }}
      >
        <div style={{ maxWidth: 960 }}>
          {/* Hero banner */}
          <section
            style={{
              background: "linear-gradient(135deg,#c77a2d,#8a4f1e)",
              borderRadius: "var(--r-xl)",
              padding: "var(--space-8)",
              color: "#fff",
              marginBottom: "var(--space-5)",
            }}
          >
            <div
              style={{
                opacity: 0.85,
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-1)",
              }}
            >
              {course.pillar} · {course.level}
            </div>
            <h1
              style={{
                color: "#fff",
                fontSize: "var(--text-3xl)",
                marginBottom: "var(--space-2)",
              }}
            >
              {course.title}
            </h1>
            {course.description && (
              <p
                style={{
                  fontSize: "var(--text-base)",
                  opacity: 0.92,
                  lineHeight: "var(--lh-normal)",
                  maxWidth: 720,
                }}
              >
                {course.description}
              </p>
            )}
            <div
              style={{
                display: "flex",
                gap: "var(--space-4)",
                marginTop: "var(--space-4)",
                fontSize: "var(--text-sm)",
                flexWrap: "wrap",
              }}
            >
              <span>📹 {course.lessons.length} bài</span>
              {totalDuration > 0 && <span>⏱️ {totalDurationText}</span>}
              {course.xpReward > 0 && <span>💎 +{course.xpReward} XP</span>}
              {course.aipReward > 0 && <span>🪙 +{course.aipReward} AIP</span>}
            </div>
          </section>

          {/* Lessons */}
          <h2 style={{ marginBottom: "var(--space-3)" }}>Nội dung khóa học</h2>

          {course.lessons.length === 0 ? (
            <div className="ui-empty">
              <div className="ui-empty-icon">📘</div>
              <div className="ui-empty-title">Chưa có bài học nào</div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {course.lessons.map((l, i) => (
                <div
                  key={l.id}
                  className="ui-card ui-card-sm"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--r-full)",
                      background:
                        i === 0
                          ? "var(--brand-green)"
                          : "var(--bg-elevated)",
                      color: i === 0 ? "#fff" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "var(--fw-bold)",
                      flexShrink: 0,
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: "var(--fw-bold)",
                        color: "var(--text-heading)",
                      }}
                    >
                      {l.title}
                    </div>
                    {l.description && (
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {l.description}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {fmtDuration(l.duration)}
                    {l.xpReward > 0 && ` · +${l.xpReward} XP`}
                  </div>
                </div>
              ))}
            </div>
          )}

          {firstLesson?.videoUrl && (
            <>
              <h2
                style={{
                  margin: "var(--space-8) 0 var(--space-3)",
                }}
              >
                Bài đầu: {firstLesson.title}
              </h2>
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "#000",
                  borderRadius: "var(--r-xl)",
                  overflow: "hidden",
                }}
              >
                <iframe
                  src={firstLesson.videoUrl}
                  title={firstLesson.title}
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: 0 }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
