import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

function diffClass(d: string) {
  if (d === "HARD") return "diff-hard";
  if (d === "CHAOS") return "diff-chaos";
  return "diff-normal";
}
function diffLabel(d: string) {
  if (d === "HARD") return "⚔️ Hard";
  if (d === "CHAOS") return "🔥 Chaos";
  return "🛡️ Normal";
}

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ slug: string; challengeSlug: string }>;
}) {
  const { slug, challengeSlug } = await params;
  const session = await auth();

  const challenge = await prisma.challenge.findFirst({
    where: { community: { slug }, slug: challengeSlug },
    include: {
      tasks: { orderBy: { dayNumber: "asc" } },
      _count: { select: { members: true } },
      community: { select: { name: true, id: true } },
    },
  });
  if (!challenge) notFound();

  let myMembership:
    | { id: string; status: string; personalStartsAt: Date | null; completedAt: Date | null }
    | null = null;
  if (session?.user?.id) {
    const m = await prisma.challengeMember.findFirst({
      where: { challengeId: challenge.id, userId: session.user.id },
      select: {
        id: true,
        status: true,
        personalStartsAt: true,
        completedAt: true,
      },
    });
    myMembership = m;
  }

  async function join() {
    "use server";
    const s = await auth();
    if (!s?.user?.id) redirect("/login");
    const communityMembership = await prisma.membership.findUnique({
      where: {
        userId_communityId: {
          userId: s.user!.id!,
          communityId: challenge!.community.id,
        },
      },
    });
    if (!communityMembership) redirect(`/c/${slug}`);
    await prisma.challengeMember.upsert({
      where: {
        challengeId_userId: {
          challengeId: challenge!.id,
          userId: s.user!.id!,
        },
      },
      update: {},
      create: {
        challengeId: challenge!.id,
        userId: s.user!.id!,
        status: "ACTIVE",
        personalStartsAt: new Date(),
      },
    });
    revalidatePath(`/c/${slug}/challenges/${challengeSlug}`);
  }

  const dayNow =
    myMembership?.personalStartsAt
      ? Math.min(
          challenge.requiredDays,
          Math.max(
            1,
            Math.floor(
              (Date.now() - myMembership.personalStartsAt.getTime()) /
                (1000 * 60 * 60 * 24)
            ) + 1
          )
        )
      : 0;
  const progressPct =
    challenge.requiredDays > 0
      ? Math.round((dayNow / challenge.requiredDays) * 100)
      : 0;

  return (
    <>
      <header className="view-header">
        <span className="view-title">{challenge.title}</span>
        <span className="view-subtitle">{diffLabel(challenge.difficulty)} · {challenge.requiredDays} ngày</span>
      </header>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 24px 40px",
          background: "var(--bg-chat)",
        }}
      >
        <div className="ch-inner ch-detail">
          <div className="ch-detail-header">
            <div className={`ch-detail-banner ${diffClass(challenge.difficulty)}`}>
              <div
                className="ch-diff-badge"
                style={{ position: "absolute", top: 14, left: 14 }}
              >
                {diffLabel(challenge.difficulty)}
              </div>
              {challenge.status !== "COMPLETED" && (
                <div
                  className={`ch-status-badge ${challenge.status === "ACTIVE" ? "active" : "open"}`}
                  style={{ position: "absolute", top: 14, right: 14 }}
                >
                  {challenge.status}
                </div>
              )}
              <div className="ch-detail-banner-title">{challenge.title}</div>
            </div>
            <div className="ch-detail-meta-row">
              <div className="meta-item">
                <span className="meta-label">Thời gian:</span>
                <span>{challenge.requiredDays} ngày</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Thành viên:</span>
                <span>
                  {challenge._count.members} / {challenge.maxMembers}
                </span>
              </div>
              {challenge.depositAip && (
                <div className="meta-item">
                  <span className="meta-label">Deposit:</span>
                  <span>{challenge.depositAip} AIP</span>
                </div>
              )}
              {challenge.startsAt && (
                <div className="meta-item">
                  <span className="meta-label">Bắt đầu:</span>
                  <span>
                    {challenge.startsAt.toLocaleDateString("vi-VN")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {challenge.description && (
            <p
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                padding: 20,
                color: "var(--text-normal)",
                lineHeight: 1.7,
                marginTop: 16,
              }}
            >
              {challenge.description}
            </p>
          )}

          {/* Progress (if joined) */}
          {myMembership ? (
            <div className="ch-progress-card" style={{ marginTop: 20 }}>
              <div className="ch-progress-header">
                <div className="ch-progress-day">
                  Ngày <span className="day-num">{dayNow}</span> / {challenge.requiredDays}
                </div>
              </div>
              <div className="ch-progress-bar">
                <div
                  className="ch-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="ch-progress-hint">
                {myMembership.completedAt
                  ? "Đã hoàn thành"
                  : `Còn ${Math.max(0, challenge.requiredDays - dayNow)} ngày`}
              </div>
            </div>
          ) : (
            session?.user && (
              <form action={join} style={{ marginTop: 20 }}>
                <button
                  type="submit"
                  style={{
                    padding: "12px 28px",
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fff",
                    background: "var(--brand-green)",
                    border: "none",
                    borderRadius: 10,
                  }}
                >
                  Tham gia challenge
                </button>
              </form>
            )
          )}

          {/* Tasks list */}
          {challenge.tasks.length > 0 && (
            <>
              <div className="ch-section-title" style={{ marginTop: 24 }}>
                <span>Daily Tasks</span>
                <span className="count">
                  {challenge.tasks.length} tasks
                </span>
              </div>
              {challenge.tasks.map((t) => {
                const isCurrent = t.dayNumber === dayNow;
                return (
                  <div
                    key={t.id}
                    className={`ch-task${isCurrent ? " current open" : ""}`}
                  >
                    <div className="ch-task-head">
                      <div className="ch-task-day">{t.dayNumber}</div>
                      <div className="ch-task-info">
                        <div className="ch-task-label">
                          Day {t.dayNumber}
                          {t.label ? ` · ${t.label}` : ""}
                        </div>
                        <div className="ch-task-title">{t.title}</div>
                      </div>
                      {isCurrent && (
                        <span className="ch-task-status">
                          <span className="pending">● Hôm nay</span>
                        </span>
                      )}
                    </div>
                    {isCurrent && t.description && (
                      <div className="ch-task-body">
                        <div className="ch-task-desc">{t.description}</div>
                        {t.sopContent && (
                          <div className="ch-task-sop">
                            <div className="ch-task-sop-label">
                              📋 SOP — Các bước
                            </div>
                            <div
                              className="ch-task-sop-content"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              {t.sopContent}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
