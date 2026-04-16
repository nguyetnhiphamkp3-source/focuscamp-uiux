import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CheckinForm } from "@/components/community/checkin-form";
import {
  getActiveChallenge,
  getChallengeLeaderboard,
} from "@/lib/services/challenge";

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
      products: {
        orderBy: { relevance: "asc" },
        include: { product: true },
      },
    },
  });
  if (!challenge) notFound();

  // Recent social check-ins (all members, last 20)
  const recentCheckins = await prisma.checkin.findMany({
    where: { challengeId: challenge.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
  });

  // My check-ins for this challenge (to mark tasks done)
  const myCheckins = session?.user?.id
    ? await prisma.checkin.findMany({
        where: { challengeId: challenge.id, userId: session.user.id },
        select: { taskId: true, dayNumber: true, createdAt: true },
      })
    : [];
  const doneDayNumbers = new Set(
    myCheckins
      .map((c) => c.dayNumber ?? null)
      .filter((n): n is number => n !== null)
  );

  // Leaderboard for this challenge
  const leaderboard = await getChallengeLeaderboard(challenge.id, 10);

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
          padding: "var(--space-5) var(--space-6) var(--space-10)",
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
            <>
              {/* Missed day warning */}
              {(() => {
                const elapsed = myMembership.personalStartsAt
                  ? Math.floor(
                      (Date.now() - myMembership.personalStartsAt.getTime()) /
                        (1000 * 60 * 60 * 24)
                    ) + 1
                  : 1;
                const currentDay = Math.min(challenge.requiredDays, Math.max(1, elapsed));
                let missed = 0;
                for (let d = 1; d < currentDay; d++) {
                  if (!doneDayNumbers.has(d)) missed++;
                }
                if (missed <= 0 || myMembership.completedAt) return null;
                return (
                  <div
                    style={{
                      marginTop: "var(--space-5)",
                      padding: "var(--space-3) var(--space-4)",
                      borderRadius: "var(--r-md)",
                      background: "var(--warning-soft)",
                      border: "1px solid var(--warning)",
                      color: "#a16207",
                      fontSize: "var(--text-sm)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                    }}
                  >
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <span>
                      Bạn đã bỏ lỡ <strong>{missed} ngày</strong>. Check-in bù
                      để giữ momentum — không có streak thì XP bonus giảm.
                    </span>
                  </div>
                );
              })()}

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

              {/* Daily check-in form — only when active + not completed */}
              {!myMembership.completedAt && session?.user && (() => {
                return (
                  <div style={{ marginTop: "var(--space-5)" }}>
                    <CheckinGate
                      userId={session.user.id!}
                      communityId={challenge.community.id}
                      challengeId={challenge.id}
                      communitySlug={slug}
                      challengeSlug={challengeSlug}
                    />
                  </div>
                );
              })()}
            </>
          ) : (
            session?.user && (
              <form action={join} style={{ marginTop: "var(--space-5)" }}>
                <button type="submit" className="ui-btn ui-btn-primary ui-btn-lg">
                  Tham gia challenge
                </button>
              </form>
            )
          )}

          {/* Equipment — related marketplace items */}
          {challenge.products.length > 0 && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <h2 style={{ marginBottom: "var(--space-3)" }}>
                🎒 Trang bị hỗ trợ
              </h2>
              <div
                style={{
                  display: "grid",
                  gap: "var(--space-3)",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                }}
              >
                {challenge.products.map((link) => {
                  const p = link.product;
                  const tag =
                    link.relevance === "REQUIRED"
                      ? "⭐ Bắt buộc"
                      : link.relevance === "OPTIONAL"
                        ? "Tuỳ chọn"
                        : "Đề xuất";
                  return (
                    <Link
                      key={p.id}
                      href={`/c/${slug}/marketplace/${p.slug}`}
                      className="ui-card ui-card-sm"
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--space-2)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color:
                            link.relevance === "REQUIRED"
                              ? "var(--warning)"
                              : "var(--text-muted)",
                          fontWeight: "var(--fw-bold)",
                        }}
                      >
                        {tag}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-md)",
                          fontWeight: "var(--fw-bold)",
                          color: "var(--text-heading)",
                          lineHeight: "var(--lh-snug)",
                        }}
                      >
                        {p.title}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-sm)",
                          color: "var(--brand-green)",
                          fontWeight: "var(--fw-bold)",
                          marginTop: "auto",
                        }}
                      >
                        {p.isFree
                          ? "Miễn phí"
                          : `${Number(p.priceVnd).toLocaleString("vi-VN")}đ`}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
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
                const isDone = doneDayNumbers.has(t.dayNumber);
                const isCurrent = !isDone && t.dayNumber === dayNow;
                const isFuture = t.dayNumber > dayNow && !isDone;
                return (
                  <div
                    key={t.id}
                    className={`ch-task${isCurrent ? " current open" : ""}`}
                    style={{
                      opacity: isFuture ? 0.5 : 1,
                    }}
                  >
                    <div className="ch-task-head">
                      <div
                        className="ch-task-day"
                        style={
                          isDone
                            ? {
                                background: "var(--brand-green)",
                                color: "#fff",
                              }
                            : undefined
                        }
                      >
                        {isDone ? "✓" : t.dayNumber}
                      </div>
                      <div className="ch-task-info">
                        <div className="ch-task-label">
                          Day {t.dayNumber}
                          {t.label ? ` · ${t.label}` : ""}
                        </div>
                        <div
                          className="ch-task-title"
                          style={
                            isDone
                              ? {
                                  textDecoration: "line-through",
                                  color: "var(--text-muted)",
                                }
                              : undefined
                          }
                        >
                          {t.title}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="ch-task-status">
                          <span className="pending">● Hôm nay</span>
                        </span>
                      )}
                      {isDone && (
                        <span className="ch-task-status">
                          <span
                            style={{
                              color: "var(--brand-green)",
                              fontSize: "var(--text-xs)",
                              fontWeight: "var(--fw-bold)",
                            }}
                          >
                            ✓ Xong
                          </span>
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

          {/* Social feed — recent check-ins from everyone */}
          {recentCheckins.length > 0 && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <h2 style={{ marginBottom: "var(--space-3)" }}>
                🔥 Check-in gần đây ({recentCheckins.length})
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-3)",
                }}
              >
                {recentCheckins.map((c) => {
                  const name = c.user.name || c.user.email || "Member";
                  return (
                    <div
                      key={c.id}
                      className="ui-card"
                      style={{
                        display: "flex",
                        gap: "var(--space-3)",
                        alignItems: "flex-start",
                      }}
                    >
                      {c.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.user.image}
                          alt={name}
                          referrerPolicy="no-referrer"
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            background: "var(--bg-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "var(--fw-bold)",
                            flexShrink: 0,
                          }}
                        >
                          {name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "var(--space-2)",
                            marginBottom: "var(--space-1)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: "var(--fw-bold)",
                              color: "var(--text-heading)",
                            }}
                          >
                            {name}
                          </span>
                          {c.dayNumber && (
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--brand-green)",
                                fontWeight: "var(--fw-bold)",
                              }}
                            >
                              Day {c.dayNumber}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: "var(--text-xs)",
                              color: "var(--text-muted)",
                              marginLeft: "auto",
                            }}
                          >
                            {c.createdAt.toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            color: "var(--text-normal)",
                            lineHeight: "var(--lh-relaxed)",
                          }}
                        >
                          {c.content}
                        </div>
                        {c.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.imageUrl}
                            alt=""
                            style={{
                              marginTop: "var(--space-2)",
                              maxWidth: "100%",
                              maxHeight: 240,
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border-subtle)",
                            }}
                          />
                        )}
                        {c.linkUrl && (
                          <a
                            href={c.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-block",
                              marginTop: "var(--space-2)",
                              fontSize: "var(--text-xs)",
                              color: "var(--text-link)",
                              fontWeight: "var(--fw-semibold)",
                            }}
                          >
                            🔗 {c.linkUrl.replace(/^https?:\/\//, "").slice(0, 60)}
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <h2 style={{ marginBottom: "var(--space-3)" }}>
                🏁 Bảng xếp hạng
              </h2>
              <div
                className="ui-card"
                style={{ padding: 0, overflow: "hidden" }}
              >
                {leaderboard.map((row, i) => {
                  const isMe = row.userId === session?.user?.id;
                  return (
                    <div
                      key={row.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        borderBottom:
                          i < leaderboard.length - 1
                            ? "1px solid var(--border-subtle)"
                            : "none",
                        background: isMe
                          ? "var(--brand-green-soft)"
                          : "transparent",
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          textAlign: "center",
                          fontWeight: "var(--fw-extrabold)",
                          color: "var(--text-heading)",
                          fontSize: "var(--text-md)",
                        }}
                      >
                        {i === 0
                          ? "🥇"
                          : i === 1
                            ? "🥈"
                            : i === 2
                              ? "🥉"
                              : i + 1}
                      </div>
                      {row.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.image}
                          alt={row.name}
                          referrerPolicy="no-referrer"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--bg-elevated)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "var(--fw-bold)",
                            flexShrink: 0,
                            fontSize: "var(--text-sm)",
                          }}
                        >
                          {row.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isMe
                              ? "var(--fw-bold)"
                              : "var(--fw-semibold)",
                            color: "var(--text-heading)",
                            fontSize: "var(--text-sm)",
                          }}
                        >
                          {row.name}
                          {isMe && (
                            <span
                              style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--brand-green)",
                                marginLeft: 6,
                                fontWeight: "var(--fw-bold)",
                              }}
                            >
                              (bạn)
                            </span>
                          )}
                          {row.status === "COMPLETED" && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: "var(--text-xs)",
                                color: "var(--warning)",
                                fontWeight: "var(--fw-bold)",
                              }}
                            >
                              ✓ Hoàn thành
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-muted)",
                            marginTop: 2,
                          }}
                        >
                          Day {row.currentDay} · {row.totalCheckins} check-in
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--fw-bold)",
                          color: row.streak > 0 ? "var(--brand-green)" : "var(--text-muted)",
                          flexShrink: 0,
                        }}
                      >
                        🔥 {row.streak}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

async function CheckinGate({
  userId,
  communityId,
  challengeId,
  communitySlug,
  challengeSlug,
}: {
  userId: string;
  communityId: string;
  challengeId: string;
  communitySlug: string;
  challengeSlug: string;
}) {
  const active = await getActiveChallenge(userId, communityId);
  if (!active || active.challengeId !== challengeId) return null;

  if (active.checkedInToday) {
    return (
      <div
        className="ui-card"
        style={{
          background: "var(--success-soft)",
          border: "1px solid var(--success)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: "var(--space-1)" }}>✓</div>
        <div
          style={{
            fontWeight: "var(--fw-bold)",
            color: "var(--brand-green-dark)",
          }}
        >
          Đã check-in hôm nay
        </div>
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginTop: "var(--space-1)",
          }}
        >
          Hẹn gặp lại ngày mai để giữ streak 🔥
        </div>
      </div>
    );
  }

  // Fetch today's task to render inside check-in form
  const today = await prisma.challengeTask.findFirst({
    where: { challengeId: active.challengeId, dayNumber: active.currentDay },
    select: {
      id: true,
      dayNumber: true,
      title: true,
      label: true,
      description: true,
      sopContent: true,
      evidenceType: true,
      evidenceLabel: true,
    },
  });

  return (
    <CheckinForm
      challengeId={challengeId}
      communitySlug={communitySlug}
      challengeSlug={challengeSlug}
      task={today}
    />
  );
}
