import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { joinChallengeAction, startChallengeAction } from "@/app/actions/challenge-review";
import { CheckinForm } from "@/components/community/checkin-form";
import { SubmissionReviewPanel } from "@/components/community/submission-review-panel";
import type { SubmissionRow } from "@/components/community/submission-review-panel";
import { PendingMembersPanel } from "@/components/community/pending-members-panel";
import { ChallengeSettingsPanel } from "@/components/community/challenge-settings-panel";
import { ChallengeEditButton } from "@/components/community/challenge-edit-button";
import { CheckinVoteButton } from "@/components/community/checkin-vote-button";
import { ResubmitForm } from "@/components/community/resubmit-form";
import { TaskEditorButton } from "@/components/community/task-editor";
import { CreateTaskButton } from "@/components/community/create-task-button";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { checkGate, getTiersConfig, getUserTier } from "@/lib/services/subscription";
import { parsePricingConfig, calculateEffectivePrice } from "@/lib/services/pricing";
import { PayWithAipButton } from "@/components/community/pay-with-aip-button";
import {
  getActiveChallenge,
  getChallengeLeaderboard,
  listChallengeSubmissions,
  listPendingMembers,
} from "@/lib/services/challenge";
import { ChallengeSalesIntro } from "@/components/community/challenge-sales-intro";
import { RenewPaymentButton } from "@/components/community/renew-payment-button";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";
import { toEmbedUrl } from "@/lib/brand";

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

function evidenceTypeLabel(type: string) {
  if (type === "LINK") return "Link";
  if (type === "IMAGE") return "Image";
  return "Text";
}

export default async function ChallengeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; challengeSlug: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { slug, challengeSlug } = await params;
  const sp = await searchParams;
  const session = await auth();

  const challenge = await prisma.challenge.findFirst({
    where: { community: { slug }, slug: challengeSlug },
    include: {
      tasks: { orderBy: { dayNumber: "asc" } },
      _count: { select: { members: true } },
      community: {
        select: {
          name: true,
          id: true,
          ownerId: true,
          tiersConfig: true,
          memberships: session?.user?.id
            ? { where: { userId: session.user.id }, select: { role: true } }
            : false,
        },
      },
      products: {
        orderBy: { relevance: "asc" },
        include: { product: true },
      },
    },
  });
  if (!challenge) notFound();

  const realIsOwner =
    !!session?.user?.id && session.user.id === challenge.community.ownerId;
  const { effectiveIsOwner: isOwner } = await getEffectiveOwnership(realIsOwner);
  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: Array.isArray(challenge.community.memberships)
      ? challenge.community.memberships[0]?.role
      : null,
  });
  const permissions = communityPermissionFlags(role);

  // Tier gate check — non-owners must have sufficient tier for this difficulty
  let tierGateBlock: { message: string; requiredTier: string } | null = null;
  if (session?.user?.id && !realIsOwner && challenge.difficulty !== "NORMAL") {
    const communityFull = await prisma.community.findUnique({
      where: { id: challenge.community.id },
      select: { tiersConfig: true },
    });
    const tiersConfig = getTiersConfig(communityFull?.tiersConfig);
    const gateResult = await checkGate({
      userId: session.user.id,
      communityId: challenge.community.id,
      tiersConfig,
      check: { type: "challenge_difficulty", difficulty: challenge.difficulty },
    });
    if (!gateResult.allowed) {
      tierGateBlock = {
        message: gateResult.message,
        requiredTier: gateResult.requiredTier,
      };
    }
  }

  // Phase C — operator review panel data
  type ReviewTab = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
  const reviewTab = ((): ReviewTab => {
    const t = (sp.review || "").toUpperCase();
    if (t === "PENDING" || t === "APPROVED" || t === "REJECTED" || t === "ALL")
      return t as ReviewTab;
    return "PENDING"; // default shows what needs attention
  })();
  let submissionData: {
    rows: SubmissionRow[];
    total: number;
    pendingCount: number;
  } | null = null;
  const pendingMembers = permissions.canReviewChallengeMembers ? await listPendingMembers(challenge.id) : [];
  const communityProducts = permissions.canManageChallenges
    ? await prisma.product.findMany({
        where: { communityId: challenge.community.id },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  if (permissions.canReviewSubmissions) {
    const res = await listChallengeSubmissions({
      challengeId: challenge.id,
      status: reviewTab,
      limit: 50,
    });
    submissionData = {
      rows: res.rows.map((r) => ({
        id: r.id,
        content: r.content,
        linkUrl: r.linkUrl,
        imageUrl: r.imageUrl,
        status: r.status,
        reviewNote: r.reviewNote,
        reviewedAt: r.reviewedAt,
        createdAt: r.createdAt,
        dayNumber: r.dayNumber,
        user: r.user,
        task: r.task
          ? { dayNumber: r.task.dayNumber, title: r.task.title, label: r.task.label }
          : null,
        reviewedBy: r.reviewedBy,
      })),
      total: res.total,
      pendingCount: res.pendingCount,
    };
  }

  // Recent social check-ins (temporarily hidden in UI; kept intact for re-enable)
  const recentCheckins = await prisma.checkin.findMany({
    where: { challengeId: challenge.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: { select: { name: true, email: true, image: true } },
      _count: { select: { votes: true } },
      ...(session?.user?.id
        ? {
            votes: {
              where: { userId: session.user.id },
              select: { id: true },
            },
          }
        : {}),
    },
  });

  // My check-ins for this challenge (to mark tasks done)
  const myCheckins = session?.user?.id
    ? await prisma.checkin.findMany({
        where: { challengeId: challenge.id, userId: session.user.id },
        select: { id: true, taskId: true, dayNumber: true, createdAt: true, updatedAt: true, content: true, linkUrl: true, imageUrl: true, status: true, reviewedAt: true, reviewNote: true, rejectCount: true },
      })
    : [];
  // Only count non-rejected checkins as done
  const doneDayNumbers = new Set(
    myCheckins
      .filter((c) => c.status !== "REJECTED")
      .map((c) => c.dayNumber ?? null)
      .filter((n): n is number => n !== null)
  );
  const checkinByDay = new Map(
    myCheckins
      .filter((c) => c.dayNumber !== null)
      .map((c) => [c.dayNumber!, c] as const)
  );

  // Leaderboard for this challenge
  const leaderboard = await getChallengeLeaderboard(challenge.id, 10);

  let myMembership:
    | { id: string; status: string; personalStartsAt: Date | null; completedAt: Date | null; joinedAt: Date }
    | null = null;
  let pendingPaymentCode: string | null = null;
  let renewalInfo: { originalAmountVnd: number; hasLateFee: boolean } | null = null;
  if (session?.user?.id) {
    const m = await prisma.challengeMember.findFirst({
      where: { challengeId: challenge.id, userId: session.user.id },
      select: {
        id: true,
        status: true,
        personalStartsAt: true,
        completedAt: true,
        joinedAt: true,
      },
    });
    myMembership = m;
    if (m?.status === "PAYMENT_PENDING") {
      const now = new Date();
      // Find a still-valid PENDING payment (not expired)
      const validPayment = await prisma.payment.findFirst({
        where: { refType: "challenge", refId: m.id, status: "PENDING", expiresAt: { gt: now } },
        select: { paymentCode: true },
        orderBy: { createdAt: "desc" },
      });
      pendingPaymentCode = validPayment?.paymentCode ?? null;

      if (!pendingPaymentCode) {
        // Payment expired — fetch original amount for renewal UI
        const originalPayment = await prisma.payment.findFirst({
          where: { refType: "challenge", refId: m.id },
          orderBy: { createdAt: "asc" },
          select: { amountVnd: true },
        });
        const minutesSinceJoin = (Date.now() - m.joinedAt.getTime()) / 60000;
        renewalInfo = {
          originalAmountVnd: Number(originalPayment?.amountVnd ?? 0),
          hasLateFee: minutesSinceJoin > 30,
        };
      }
    }
  }

  const joinAction = joinChallengeAction.bind(null, {
    challengeId: challenge.id,
    communityId: challenge.community.id,
    communitySlug: slug,
    challengeSlug,
    requiresApproval: challenge.requiresApproval,
  });

  // Effective price for current user — fall back to priceVnd if no pricingConfig
  const pricingConfig = parsePricingConfig(challenge.pricingConfig) ??
    (challenge.priceVnd
      ? { guestVnd: Number(challenge.priceVnd), memberVnd: Number(challenge.priceVnd) }
      : null);
  let effectivePrice: { vnd: number; canPayAip: boolean; aipPrice: number; aipBalance: number } | null = null;
  if (pricingConfig && session?.user?.id) {
    const communityMembership = await prisma.membership.findUnique({
      where: { userId_communityId: { userId: session.user.id, communityId: challenge.community.id } },
      select: { aip: true },
    });
    const { tierKey } = communityMembership
      ? await getUserTier({ userId: session.user.id, communityId: challenge.community.id })
      : { tierKey: null };
    effectivePrice = calculateEffectivePrice(pricingConfig, {
      isMember: !!communityMembership,
      tierKey,
      aipBalance: communityMembership?.aip ?? 0,
    });
  } else if (pricingConfig && !session?.user?.id) {
    // Guest — show guest price without AIP
    effectivePrice = calculateEffectivePrice(pricingConfig, { isMember: false, tierKey: null, aipBalance: 0 });
  }

  const dayNow = (() => {
    if (myMembership?.completedAt) return challenge.requiredDays;
    if (!myMembership?.personalStartsAt) return 0;
    const startDay = new Date(myMembership.personalStartsAt);
    startDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsedDays = Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(challenge.requiredDays, Math.max(1, elapsedDays + 1));
  })();

  const currentTaskDeadlineLabel = myMembership?.personalStartsAt && dayNow > 0
    ? new Date(myMembership.personalStartsAt.getTime() + dayNow * 24 * 60 * 60 * 1000).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : undefined;

  // Compute per-task unlock status based on taskUnlockMode
  const unlockMode = challenge.taskUnlockMode ?? "DAILY";
  const defaultInterval = challenge.unlockIntervalHours ?? 24;
  const personalStart = myMembership?.personalStartsAt?.getTime() ?? 0;

  const tasks = challenge.tasks;
  function isTaskUnlocked(task: { dayNumber: number; unlockAfterHours: number | null }, taskIndex: number): boolean {
    if (!myMembership?.personalStartsAt) return false;
    if (myMembership.completedAt) return true;

    switch (unlockMode) {
      case "ALL":
        return true;
      case "DAILY": {
        let cumulativeHours = 0;
        for (let i = 0; i < taskIndex; i++) {
          cumulativeHours += tasks[i].unlockAfterHours ?? defaultInterval;
        }
        // For whole-day intervals, compare against midnight-normalized dayNow
        // so unlock is consistent with the displayed day number.
        const unlockAfterDays = cumulativeHours / 24;
        if (Number.isInteger(unlockAfterDays)) {
          return dayNow > unlockAfterDays;
        }
        // Non-whole-day intervals: fall back to raw timestamp comparison
        const unlockTime = personalStart + cumulativeHours * 60 * 60 * 1000;
        return Date.now() >= unlockTime;
      }
      case "SEQUENTIAL": {
        if (taskIndex === 0) return true;
        const prevTask = tasks[taskIndex - 1];
        return doneDayNumbers.has(prevTask.dayNumber);
      }
      case "MANUAL": {
        if (taskIndex === 0) return true;
        return task.unlockAfterHours === 0;
      }
      default:
        return true;
    }
  }
  const progressPct =
    challenge.requiredDays > 0
      ? Math.round((dayNow / challenge.requiredDays) * 100)
      : 0;

  return (
    <>
      <header className="view-header">
        <span className="view-title">{challenge.title}</span>
        <span className="view-subtitle">{diffLabel(challenge.difficulty)} · {challenge.requiredDays} ngày</span>
        {permissions.canManageChallenges && <ChallengeEditButton />}
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
          {/* Freeze banners — check all windows */}
          {(() => {
            const now = new Date();
            const windows = challenge.freezeWindows as Array<{ label?: string; startsAt: string; endsAt: string }> | null ?? [];
            // Also check legacy single window
            if (challenge.freezeStartsAt && challenge.freezeEndsAt) {
              windows.push({ startsAt: challenge.freezeStartsAt.toISOString(), endsAt: challenge.freezeEndsAt.toISOString() });
            }
            const active = windows.find(w => now >= new Date(w.startsAt) && now <= new Date(w.endsAt));
            if (!active) return null;
            return (
              <div style={{ padding: "12px 16px", marginBottom: "var(--space-4)", background: "linear-gradient(135deg, rgba(88,101,242,0.12), rgba(0,168,252,0.08))", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 12, fontSize: "var(--text-sm)", color: "var(--info)", fontWeight: 600 }}>
                ⏸ Challenge đang <strong>freeze</strong>{active.label ? ` — ${active.label}` : ""} đến{" "}
                {new Date(active.endsAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                . Trong lúc này bạn không cần lo miss — tiếp tục khi hết freeze.
              </div>
            );
          })()}

          {/* Admin-only settings panel */}
          {permissions.canManageChallenges && (
            <ChallengeSettingsPanel
              challengeId={challenge.id}
              communitySlug={slug}
              challengeSlug={challengeSlug}
              initial={{
                title: challenge.title,
                description: challenge.description,
                pitch: challenge.pitch ?? null,
                requiresApproval: challenge.requiresApproval,
                freezeWindows: (challenge.freezeWindows as Array<{ label?: string; startsAt: string; endsAt: string }> | null) ?? null,
                bannerUrl: challenge.bannerUrl,
                featuredOnGlobal: challenge.featuredOnGlobal,
                pricingConfig: parsePricingConfig(challenge.pricingConfig),
                tiers: getTiersConfig(challenge.community.tiersConfig).map((t) => ({ key: t.key, label: t.label })),
                hideFutureTasks: challenge.hideFutureTasks,
                taskUnlockMode: challenge.taskUnlockMode,
                unlockIntervalHours: challenge.unlockIntervalHours,
                bumpProductId: (challenge as { bumpProductId?: string | null }).bumpProductId ?? null,
              }}
              communityProducts={communityProducts}
            />
          )}

          {/* Admin-only pending member requests panel */}
          {permissions.canReviewChallengeMembers && pendingMembers.length > 0 && (
            <PendingMembersPanel
              communitySlug={slug}
              challengeSlug={challengeSlug}
              members={pendingMembers.map((m) => ({
                id: m.id,
                joinedAt: m.joinedAt,
                user: m.user,
              }))}
            />
          )}

          <div className="ch-detail-header">
            <div
              className={`ch-detail-banner ${diffClass(challenge.difficulty)}`}
              style={
                challenge.bannerUrl
                  ? ({ ["--bg-img" as string]: `url("${challenge.bannerUrl}")` } as React.CSSProperties)
                  : undefined
              }
            >
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


          {/* Progress (if joined) */}
          {myMembership?.status === "PAYMENT_PENDING" ? (
            <ChallengeSalesIntro
              challenge={{
                ...challenge,
                pitch: challenge.pitch ?? null,
                tasks: challenge.tasks as { id: string; dayNumber: number; title: string }[],
                products: challenge.products.map((l) => ({
                  id: l.product.id,
                  relevance: l.relevance,
                  product: l.product,
                })),
              }}
              effectivePrice={effectivePrice}
              communitySlug={slug}
              joinButton={
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div style={{ padding: "16px 20px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(217,119,6,0.4)", borderRadius: 12, fontSize: "var(--text-sm)", color: "#92400e", fontWeight: 600 }}>
                    ⏳ Bạn chưa hoàn tất thanh toán để tham gia challenge này.
                  </div>
                  {pendingPaymentCode ? (
                    <a
                      href={`/pay/${pendingPaymentCode}?return=${encodeURIComponent(`/c/${slug}/challenges/${challengeSlug}`)}`}
                      className="ui-btn ui-btn-primary ui-btn-lg"
                      style={{ textAlign: "center", textDecoration: "none" }}
                    >
                      💳 Hoàn tất thanh toán
                    </a>
                  ) : renewalInfo ? (
                    <RenewPaymentButton
                      challengeId={challenge.id}
                      communitySlug={slug}
                      challengeSlug={challengeSlug}
                      originalAmountVnd={renewalInfo.originalAmountVnd}
                      hasLateFee={renewalInfo.hasLateFee}
                    />
                  ) : null}
                </div>
              }
            />
          ) : myMembership?.status === "PENDING" ? (
            <div style={{ marginTop: "var(--space-5)", padding: "16px 20px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 12, fontSize: "var(--text-sm)", color: "var(--warning)" }}>
              ⏳ Yêu cầu tham gia của bạn đang chờ admin duyệt. Bạn sẽ nhận thông báo khi được chấp thuận.
            </div>
          ) : myMembership?.status === "ACTIVE" && !myMembership.personalStartsAt ? (
            <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ padding: "14px 18px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                Bạn đã tham gia challenge. Nhấn <strong>Bắt đầu</strong> khi sẵn sàng — đồng hồ đếm ngày sẽ chạy từ lúc này.
              </div>
              <form action={startChallengeAction.bind(null, { challengeId: challenge.id, communitySlug: slug, challengeSlug })}>
                <button type="submit" className="ui-btn ui-btn-primary ui-btn-lg" style={{ width: "100%" }}>
                  🚀 Bắt đầu ngay
                </button>
              </form>
            </div>
          ) : myMembership ? (
            <>
              {/* Missed day warning */}
              {(() => {
                const currentDay = dayNow;
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

            </>
          ) : tierGateBlock ? (
            <UpgradePrompt
              message={tierGateBlock.message}
              requiredTier={tierGateBlock.requiredTier}
              communitySlug={slug}
            />
          ) : (
            <ChallengeSalesIntro
              challenge={{
                ...challenge,
                pitch: challenge.pitch ?? null,
                tasks: challenge.tasks as { id: string; dayNumber: number; title: string }[],
                products: challenge.products.map((l) => ({
                  id: l.product.id,
                  relevance: l.relevance,
                  product: l.product,
                })),
              }}
              effectivePrice={effectivePrice}
              communitySlug={slug}
              joinButton={
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <form action={joinAction}>
                    <button type="submit" className="ui-btn ui-btn-primary ui-btn-lg" style={{ width: "100%" }}>
                      {effectivePrice && effectivePrice.vnd > 0
                        ? `🚀 Đăng ký ngay — ${Number(effectivePrice.vnd).toLocaleString("vi-VN")}đ`
                        : "🚀 Tham gia challenge — Miễn phí"}
                    </button>
                  </form>
                  {effectivePrice?.canPayAip && (
                    <PayWithAipButton
                      challengeId={challenge.id}
                      communityId={challenge.community.id}
                      communitySlug={slug}
                      challengeSlug={challengeSlug}
                      requiresApproval={challenge.requiresApproval}
                      aipPrice={effectivePrice.aipPrice}
                      aipBalance={effectivePrice.aipBalance}
                    />
                  )}
                </div>
              }
            />
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

          {/* Tasks list — only for members/owners; non-members see the preview in ChallengeSalesIntro */}
          {(challenge.tasks.length > 0 || permissions.canManageChallenges) && (myMembership || permissions.canManageChallenges) && (
            <>
              <div className="ch-section-title" style={{ marginTop: 24 }}>
                <span>Daily Tasks</span>
                <span className="count">
                  {challenge.hideFutureTasks && myMembership && !permissions.canManageChallenges
                    ? `Ngày ${dayNow} / ${challenge.tasks.length}`
                    : `${challenge.tasks.length} tasks`}
                </span>
              </div>
              {challenge.tasks.map((t, taskIndex) => {
                const hasEvidenceHint = !!(t.evidenceLabel || t.evidenceType !== "TEXT");
                const checkinData = checkinByDay.get(t.dayNumber);
                const isRejected = checkinData?.status === "REJECTED";
                const isPending = checkinData?.status === "PENDING";
                const isDone = doneDayNumbers.has(t.dayNumber);
                const isCurrent = !isDone && !isRejected && t.dayNumber === dayNow;
                const isFuture = t.dayNumber > dayNow && !isDone && !isRejected;
                const isOverdue = !isDone && !isRejected && !isCurrent && t.dayNumber < dayNow;
                const dayDeadline = myMembership?.personalStartsAt
                  ? new Date(myMembership.personalStartsAt.getTime() + t.dayNumber * 24 * 60 * 60 * 1000)
                  : null;
                const isLate = !!(isDone && checkinData && dayDeadline && checkinData.createdAt.getTime() > dayDeadline.getTime());
                const hasBody = !!(t.description || t.sopContent || t.videoUrl || hasEvidenceHint || checkinData || isCurrent || isOverdue);
                // Determine if task is locked based on unlock mode
                const taskUnlocked = isDone || permissions.canManageChallenges || isTaskUnlocked(t, taskIndex);
                const isLocked = !taskUnlocked && !isDone && !isRejected && myMembership && !myMembership.completedAt;
                // When task is locked (by mode or hideFutureTasks), show locked placeholder
                if ((isLocked || (challenge.hideFutureTasks && isFuture)) && !permissions.canManageChallenges && myMembership && !myMembership.completedAt) {
                  return (
                    <div key={t.id} className="ch-task" style={{ opacity: 0.5, userSelect: "none" }}>
                      <div className="ch-task-head" style={{ cursor: "default" }}>
                        <div className="ch-task-day">{t.dayNumber}</div>
                        <div className="ch-task-info">
                          <div className="ch-task-label">Day {t.dayNumber}{t.label ? ` · ${t.label}` : ""}</div>
                          <div className="ch-task-title" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                            🔒 Chưa mở khóa{unlockMode === "SEQUENTIAL" ? " — hoàn thành task trước để tiếp tục" : unlockMode === "MANUAL" ? " — chờ admin mở khóa" : " — chưa đến thời gian"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <details
                    key={t.id}
                    className={`ch-task${isCurrent ? " current" : ""}`}
                    open={isCurrent}
                    style={{
                      opacity: 1,
                      pointerEvents: "auto",
                    }}
                  >
                    <summary
                      className="ch-task-head"
                      style={{ listStyle: "none", cursor: hasBody ? "pointer" : "default" }}
                    >
                      <div
                        className="ch-task-day"
                        style={
                          isDone && !isPending
                            ? { background: "var(--brand-green)", color: "#fff" }
                            : isDone && isPending
                              ? { background: "var(--warning)", color: "#fff" }
                              : isRejected
                                ? { background: "var(--danger)", color: "#fff" }
                                : isOverdue
                                  ? { background: "var(--text-muted)", color: "#fff" }
                                  : undefined
                        }
                      >
                        {isDone && !isPending ? "✓" : isDone && isPending ? "⏳" : isRejected ? "✕" : t.dayNumber}
                      </div>
                      <div className="ch-task-info">
                        <div className="ch-task-label">
                          Day {t.dayNumber}
                          {t.label && (
                            <span style={{
                              marginLeft: 6,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "var(--brand-green)",
                              color: "#fff",
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                            }}>
                              {t.label}
                            </span>
                          )}
                        </div>
                        <div
                          className="ch-task-title"
                          style={
                            isDone || isRejected || isOverdue
                              ? { color: "var(--text-muted)" }
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
                      {isDone && isPending && (
                        <span className="ch-task-status">
                          <span className="pending">⏳ Chờ duyệt</span>
                        </span>
                      )}
                      {isDone && !isPending && (
                        <span className="ch-task-status">
                          <span className={isLate ? "late" : "done"}>
                            {isLate ? "Hoàn thành (Trễ)" : "Hoàn thành"}
                          </span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="ch-task-status">
                          <span className="rejected">Từ chối</span>
                        </span>
                      )}
                      {isOverdue && (
                        <span className="ch-task-status">
                          <span className="overdue">Quá hạn</span>
                        </span>
                      )}
                      {permissions.canManageChallenges && (
                        <TaskEditorButton
                          taskId={t.id}
                          communitySlug={slug}
                          challengeSlug={challengeSlug}
                          initial={{
                            title: t.title,
                            description: t.description,
                            sopContent: t.sopContent,
                            videoUrl: t.videoUrl,
                            evidenceType: t.evidenceType,
                            evidenceLabel: t.evidenceLabel,
                            label: t.label,
                            unlockAfterHours: t.unlockAfterHours,
                          }}
                        />
                      )}
                    </summary>
                    {hasBody && (
                      <div className="ch-task-body">
                        {t.description && <div className="ch-task-desc">{t.description}</div>}
                        {t.videoUrl && (() => {
                          const embedUrl = toEmbedUrl(t.videoUrl);
                          const canEmbed =
                            !!embedUrl &&
                            (embedUrl.includes("youtube.com/embed/") ||
                              embedUrl.includes("player.vimeo.com/video/") ||
                              embedUrl.includes("iframe.mediadelivery.net/embed/"));

                          return (
                            <div className="ch-task-sop">
                              <div className="ch-task-sop-label">
                                Video hướng dẫn
                              </div>
                              {canEmbed ? (
                                <div
                                  style={{
                                    position: "relative",
                                    paddingBottom: "56.25%",
                                    height: 0,
                                    borderRadius: "var(--r-md)",
                                    overflow: "hidden",
                                    background: "#000",
                                  }}
                                >
                                  <iframe
                                    src={embedUrl}
                                    title={`Day ${t.dayNumber} video`}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      width: "100%",
                                      height: "100%",
                                      border: "none",
                                    }}
                                  />
                                </div>
                              ) : (
                                <a
                                  href={t.videoUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    color: "var(--brand-green)",
                                    fontSize: "var(--text-sm)",
                                    fontWeight: "var(--fw-semibold)",
                                  }}
                                >
                                  Mở video
                                </a>
                              )}
                            </div>
                          );
                        })()}
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
                        {hasEvidenceHint && (
                          <div
                            style={{
                              marginTop: "var(--space-3)",
                              padding: "var(--space-2) var(--space-3)",
                              borderRadius: "var(--r-md)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-muted)",
                              fontSize: "var(--text-sm)",
                            }}
                          >
                            Evidence: {evidenceTypeLabel(t.evidenceType)}
                            {t.evidenceLabel ? ` · ${t.evidenceLabel}` : ""}
                          </div>
                        )}
                        {checkinData && (() => {
                          const isResubmitted = checkinData.rejectCount > 0 && !isRejected;
                          const displayTime = isResubmitted ? checkinData.updatedAt : checkinData.createdAt;
                          const fmtOpts: Intl.DateTimeFormatOptions = { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false };
                          const timeStr = displayTime.toLocaleString("vi-VN", fmtOpts);
                          return (
                          <>
                            {/* Recap block for completed tasks */}
                            {isDone && !isRejected && checkinData.content && (
                              <div style={{
                                marginTop: "var(--space-3)",
                                padding: "var(--space-3) var(--space-4)",
                                borderRadius: "var(--r-md)",
                                borderLeft: "3px solid var(--brand-green)",
                                background: "rgba(27,158,117,0.06)",
                              }}>
                                <div style={{ fontSize: "var(--text-xs)", fontWeight: "var(--fw-semibold)", color: "var(--brand-green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "var(--space-2)" }}>
                                  📌 Nhật ký của bạn · {timeStr}
                                </div>
                                <div style={{ fontSize: "var(--text-sm)", color: "var(--text-normal)", lineHeight: "var(--lh-relaxed)", whiteSpace: "pre-wrap", fontStyle: "italic" }}>
                                  &ldquo;{checkinData.content}&rdquo;
                                </div>
                                {checkinData.linkUrl && (
                                  <a href={checkinData.linkUrl} target="_blank" rel="noreferrer" className="ch-submission-link" style={{ marginTop: "var(--space-2)", display: "inline-block" }}>
                                    {checkinData.linkUrl}
                                  </a>
                                )}
                                {checkinData.imageUrl && (
                                  <img src={checkinData.imageUrl} alt="Submission" className="ch-submission-image" style={{ marginTop: "var(--space-2)" }} />
                                )}
                              </div>
                            )}
                            {/* Submission detail for rejected/pending/admin */}
                            {(isRejected || isPending || permissions.canReviewSubmissions) && (
                              <div className={`ch-submission${isRejected ? " ch-submission-rejected" : ""}`}>
                                <div className="ch-submission-label">
                                  {isRejected ? "Bài nộp bị từ chối" : isResubmitted ? "Bài nộp lại" : "Bài nộp của bạn"}
                                  <span style={{ marginLeft: "var(--space-2)", fontWeight: "var(--fw-normal)", color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                                    {isResubmitted ? `Nộp lại lúc ${timeStr}` : `Nộp lúc ${timeStr}`}
                                  </span>
                                </div>
                                {checkinData.reviewedAt && !isRejected && permissions.canReviewSubmissions && (
                                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: "var(--space-2)" }}>
                                    Duyệt lúc {checkinData.reviewedAt.toLocaleString("vi-VN", fmtOpts)}
                                  </div>
                                )}
                                {isRejected && checkinData.reviewNote && (
                                  <div className="ch-submission-reject-note">
                                    <strong>Lý do:</strong> {checkinData.reviewNote}
                                  </div>
                                )}
                                <div className="ch-submission-content">{checkinData.content}</div>
                                {isRejected && (
                                  <ResubmitForm
                                    checkinId={checkinData.id}
                                    communitySlug={slug}
                                    challengeSlug={challengeSlug}
                                    initial={{
                                      content: checkinData.content,
                                      linkUrl: checkinData.linkUrl,
                                      imageUrl: checkinData.imageUrl,
                                    }}
                                    rejectCount={checkinData.rejectCount}
                                  />
                                )}
                              </div>
                            )}
                          </>
                          );
                        })()}
                        {/* Inline check-in form for current or overdue task */}
                        {(isCurrent || isOverdue) && !myMembership?.completedAt && session?.user && (
                          <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border-subtle)" }}>
                            <CheckinForm
                              challengeId={challenge.id}
                              communitySlug={slug}
                              challengeSlug={challengeSlug}
                              hideHeader
                              task={{
                                id: t.id,
                                dayNumber: t.dayNumber,
                                title: t.title,
                                label: t.label,
                                description: t.description,
                                sopContent: t.sopContent,
                                videoUrl: t.videoUrl,
                                evidenceType: t.evidenceType,
                                evidenceLabel: t.evidenceLabel,
                              }}
                              deadlineLabel={isOverdue ? "Nộp bù" : currentTaskDeadlineLabel}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                );
              })}
            </>
          )}

          {/* Admin-only: add new task at bottom of the list */}
          {permissions.canManageChallenges && (
            <CreateTaskButton
              challengeId={challenge.id}
              communitySlug={slug}
              challengeSlug={challengeSlug}
              nextDayNumber={
                challenge.tasks.length > 0
                  ? Math.max(...challenge.tasks.map((t) => t.dayNumber)) + 1
                  : 1
              }
            />
          )}

          {/* Social feed — recent check-ins from everyone */}
          {recentCheckins.length > 0 && (
            <div style={{ display: "none", marginTop: "var(--space-8)" }}>
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
                        {/* Status badge — visible to all, critical feedback for submitter */}
                        {c.status !== "APPROVED" && (
                          <div
                            style={{
                              marginTop: "var(--space-2)",
                              display: "inline-flex",
                              gap: 6,
                              alignItems: "center",
                              fontSize: "var(--text-xs)",
                              padding: "3px 10px",
                              borderRadius: 10,
                              background:
                                c.status === "PENDING"
                                  ? "rgba(240,178,50,0.14)"
                                  : "rgba(218,55,60,0.1)",
                              color:
                                c.status === "PENDING"
                                  ? "var(--warning)"
                                  : "var(--danger)",
                              fontWeight: 700,
                            }}
                          >
                            {c.status === "PENDING"
                              ? "⏳ Đang chờ duyệt"
                              : "✕ Bị từ chối"}
                          </div>
                        )}
                        {c.reviewNote && c.status === "REJECTED" && (
                          <div
                            style={{
                              marginTop: "var(--space-2)",
                              padding: "var(--space-2) var(--space-3)",
                              fontSize: "var(--text-xs)",
                              background: "rgba(218,55,60,0.06)",
                              border: "1px solid rgba(218,55,60,0.2)",
                              borderRadius: "var(--r-sm)",
                              color: "var(--text-normal)",
                            }}
                          >
                            <strong>Admin ghi chú:</strong> {c.reviewNote}
                          </div>
                        )}
                        {/* Vote button — available to all community members */}
                        {c.status !== "REJECTED" && (
                          <div style={{ marginTop: "var(--space-2)" }}>
                            <CheckinVoteButton
                              checkinId={c.id}
                              communitySlug={slug}
                              challengeSlug={challengeSlug}
                              initialCount={c._count?.votes ?? 0}
                              initialVoted={
                                "votes" in c && Array.isArray(c.votes)
                                  ? c.votes.length > 0
                                  : false
                              }
                              disabled={!session?.user?.id}
                            />
                          </div>
                        )}
                        {/* Resubmit form — only for own rejected submissions */}
                        {c.status === "REJECTED" &&
                          session?.user?.id === c.userId && (
                            <ResubmitForm
                              checkinId={c.id}
                              communitySlug={slug}
                              challengeSlug={challengeSlug}
                              initial={{
                                content: c.content,
                                linkUrl: c.linkUrl,
                                imageUrl: c.imageUrl,
                              }}
                              rejectCount={c.rejectCount}
                            />
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

          {/* Admin/Mod submission review panel */}
          {permissions.canReviewSubmissions && submissionData && (
            <div style={{ marginTop: "var(--space-8)" }}>
              <SubmissionReviewPanel
                challengeId={challenge.id}
                communitySlug={slug}
                challengeSlug={challengeSlug}
                submissions={submissionData.rows}
                total={submissionData.total}
                pendingCount={submissionData.pendingCount}
                activeStatus={reviewTab}
              />
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
      videoUrl: true,
      evidenceType: true,
      evidenceLabel: true,
    },
  });

  const deadlineMs = active.personalStartsAt.getTime() + active.currentDay * 24 * 60 * 60 * 1000;
  const deadlineDate = new Date(deadlineMs);
  const deadlineStr = deadlineDate.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <CheckinForm
      challengeId={challengeId}
      communitySlug={communitySlug}
      challengeSlug={challengeSlug}
      task={today}
      deadlineLabel={deadlineStr}
    />
  );
}
