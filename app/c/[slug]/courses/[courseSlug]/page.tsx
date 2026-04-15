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
      community: { select: { name: true } },
    },
  });
  if (!course) notFound();

  const firstLesson = course.lessons[0];
  const totalDuration = course.lessons.reduce((s, l) => s + (l.duration ?? 0), 0);
  const totalDurationText = `${Math.floor(totalDuration / 60)} phút`;

  return (
    <>
      <header className="view-header">
        <span className="view-title">{course.title}</span>
        {course.pillar && <span className="view-subtitle">{course.pillar}</span>}
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px 40px",
          background: "var(--bg-chat)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {/* Hero banner */}
          <div
            style={{
              background: "linear-gradient(135deg,#c77a2d,#8a4f1e)",
              borderRadius: 12,
              padding: 28,
              color: "#fff",
              marginBottom: 20,
            }}
          >
            <div style={{ opacity: 0.85, fontSize: 13, marginBottom: 6 }}>
              {course.pillar} · {course.level}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                marginBottom: 8,
                fontFamily: "var(--font-heading)",
              }}
            >
              {course.title}
            </div>
            {course.description && (
              <div style={{ fontSize: 14, opacity: 0.92, lineHeight: 1.5, maxWidth: 720 }}>
                {course.description}
              </div>
            )}
            <div style={{ display: "flex", gap: 14, marginTop: 16, fontSize: 13 }}>
              <span>📹 {course.lessons.length} bài</span>
              {totalDuration > 0 && <span>⏱️ {totalDurationText}</span>}
              {course.xpReward > 0 && <span>💎 +{course.xpReward} XP</span>}
              {course.aipReward > 0 && <span>🪙 +{course.aipReward} AIP</span>}
            </div>
          </div>

          {/* Lessons list */}
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 12,
              color: "var(--text-heading)",
              fontFamily: "var(--font-heading)",
            }}
          >
            Nội dung khóa học
          </h2>
          {course.lessons.length === 0 ? (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 40,
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Chưa có bài học nào.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {course.lessons.map((l, i) => (
                <div
                  key={l.id}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background:
                        i === 0 ? "var(--brand-green)" : "var(--bg-elevated)",
                      color: i === 0 ? "#fff" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      flexShrink: 0,
                      fontSize: 13,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--text-heading)",
                      }}
                    >
                      {l.title}
                    </div>
                    {l.description && (
                      <div
                        style={{
                          fontSize: 13,
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
                      fontSize: 12,
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

          {firstLesson && firstLesson.videoUrl && (
            <>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  margin: "28px 0 12px",
                  color: "var(--text-heading)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                Bài đầu: {firstLesson.title}
              </h2>
              <div
                style={{
                  aspectRatio: "16/9",
                  background: "#000",
                  borderRadius: 12,
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
