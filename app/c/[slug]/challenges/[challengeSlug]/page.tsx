import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { joinChallengeAction, startChallengeAction } from "@/app/actions/challenge-review";
import { CheckinForm } from "@/components/community/checkin-form";
import { SubmissionReviewPanel } from "@/components/community/submission-review-panel";
import type { SubmissionRow } from "@/components/community/submission-review-panel";
import { effectivePersonalStartsAt } from "@/lib/services/challenge-progress";
import { ChallengeSettingsPanel } from "@/components/community/challenge-settings-panel";
import { ChallengeEditButton } from "@/components/community/challenge-edit-button";
import { ResubmitForm } from "@/components/community/resubmit-form";
import { TaskEditorButton } from "@/components/community/task-editor";
import { TaskGiftStrip } from "@/components/community/task-gift-strip";
import { CreateTaskButton } from "@/components/community/create-task-button";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { checkGate, getTiersConfig, getUserTier } from "@/lib/services/subscription";
import { parsePricingConfig, calculateEffectivePrice, computeChallengeLateFee } from "@/lib/services/pricing";
import { PayWithAipButton } from "@/components/community/pay-with-aip-button";
import {
  getActiveChallenge,
  getChallengeLeaderboard,
  listChallengeSubmissions,
} from "@/lib/services/challenge";
import { ChallengeSalesIntro } from "@/components/community/challenge-sales-intro";
import { RenewPaymentButton } from "@/components/community/renew-payment-button";
import { JoinChallengeWithCoupon } from "@/components/challenges/join-with-coupon";
import { getEffectiveOwnership } from "@/lib/preview-mode";
import { communityPermissionFlags, effectiveCommunityRole } from "@/lib/community-permissions";
import { toEmbedUrl } from "@/lib/brand";
import { parseChallengeVideoUrl } from "@/lib/challenge-video";
import { parseChallengeBenefits } from "@/lib/challenge-benefits";
import { SopContent } from "@/components/community/sop-content";
import { AgentReviewCard } from "@/components/community/agent-review-card";
import type { AIReviewData } from "@/lib/ai-review-data";
import { listAIProviders } from "@/lib/services/ai-provider";

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
  if (type === "TEXT_IMAGE") return "Text + Image";
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
  const bannerVideo =
    challenge.bannerMediaType === "VIDEO"
      ? parseChallengeVideoUrl(challenge.bannerVideoUrl)
      : null;

  // reviewTab needed by parallel batch below
  type ReviewTab = "ALL" | "AI_FLAGGED" | "PENDING" | "APPROVED" | "REJECTED";
  const reviewTab = ((): ReviewTab => {
    const t = (sp.review || "").toUpperCase();
    if (t === "PENDING" || t === "APPROVED" || t === "REJECTED" || t === "AI_FLAGGED" || t === "ALL")
      return t as ReviewTab;
    return "PENDING"; // default shows what needs attention
  })();

  // Parallel batch — all queries below are independent of each other.
  // Was sequential (10+ awaits in a row), now ~1 round-trip max.
  const [
    tierGateBlock,
    communityProducts,
    submissionData,
    myCheckins,
    leaderboard,
    myMembership,
    activeChallenge,
    communityMembership,
    aiProviders,
  ] = await Promise.all([
    // Tier gate — non-owners must have sufficient tier for this difficulty
    (async (): Promise<{ message: string; requiredTier: string } | null> => {
      if (!session?.user?.id || realIsOwner || challenge.difficulty === "NORMAL") return null;
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
      if (gateResult.allowed) return null;
      return { message: gateResult.message, requiredTier: gateResult.requiredTier };
    })(),

    // Admin-only: products list for settings panel
    permissions.canManageChallenges
      ? prisma.product.findMany({
          where: { communityId: challenge.community.id },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([] as { id: string; title: string }[]),

    // Operator review panel data
    permissions.canReviewSubmissions
      ? (async (): Promise<{ rows: SubmissionRow[]; total: number; pendingCount: number; aiFlaggedCount: number } | null> => {
          const res = await listChallengeSubmissions({
            challengeId: challenge.id,
            status: reviewTab,
            limit: 50,
          });
          return {
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
              aiReviewData: r.aiReviewData as SubmissionRow["aiReviewData"],
            })),
            total: res.total,
            pendingCount: res.pendingCount,
            aiFlaggedCount: res.aiFlaggedCount,
          };
        })()
      : Promise.resolve(null),

    // My check-ins for this challenge (to mark tasks done)
    session?.user?.id
      ? prisma.checkin.findMany({
          where: { challengeId: challenge.id, userId: session.user.id },
          // asc so the latest check-in per dayNumber wins the checkinByDay Map (last-write-wins);
          // keeps isPending/isRejected (and the gift gate) deterministic when a day has >1 check-in.
          orderBy: { createdAt: "asc" },
          select: { id: true, taskId: true, dayNumber: true, createdAt: true, updatedAt: true, content: true, linkUrl: true, imageUrl: true, status: true, reviewedAt: true, reviewNote: true, rejectCount: true, aiReviewData: true },
        })
      : Promise.resolve([]),

    // Leaderboard
    getChallengeLeaderboard(challenge.id, 10),

    // My membership
    session?.user?.id
      ? prisma.challengeMember.findFirst({
          where: { challengeId: challenge.id, userId: session.user.id },
          select: {
            id: true,
            status: true,
            personalStartsAt: true,
            completedAt: true,
            joinedAt: true,
          },
        })
      : Promise.resolve(null),

    // Active challenge across community (for sidebar context)
    session?.user?.id
      ? getActiveChallenge(session.user.id, challenge.community.id)
      : Promise.resolve(null),

    // Community membership (for AIP balance + pricing)
    session?.user?.id
      ? prisma.membership.findUnique({
          where: { userId_communityId: { userId: session.user.id, communityId: challenge.community.id } },
          select: { aip: true },
        })
      : Promise.resolve(null),

    permissions.canManageAiAgent && session?.user?.id
      ? listAIProviders(session.user.id, challenge.community.id)
      : Promise.resolve([]),
  ]);

  // Only count non-rejected checkins as done (PENDING+APPROVED = submitted)
  const doneDayNumbers = new Set(
    myCheckins
      .filter((c) => c.status !== "REJECTED")
      .map((c) => c.dayNumber ?? null)
      .filter((n): n is number => n !== null)
  );
  // Only APPROVED checkins count as truly completed (for SEQUENTIAL-gate + progress).
  const approvedDayNumbers = new Set(
    myCheckins
      .filter((c) => c.status === "APPROVED")
      .map((c) => c.dayNumber ?? null)
      .filter((n): n is number => n !== null)
  );
  const checkinByDay = new Map(
    myCheckins
      .filter((c) => c.dayNumber !== null)
      .map((c) => [c.dayNumber!, c] as const)
  );

  // Effective price for current user — computed first so renewalInfo can use it as fallback
  const pricingConfig = parsePricingConfig(challenge.pricingConfig) ??
    (challenge.priceVnd
      ? { guestVnd: Number(challenge.priceVnd), memberVnd: Number(challenge.priceVnd) }
      : null);
  let effectivePrice: { vnd: number; canPayAip: boolean; aipPrice: number; aipBalance: number } | null = null;
  if (pricingConfig && session?.user?.id) {
    const { tierKey } = communityMembership
      ? await getUserTier({ userId: session.user.id, communityId: challenge.community.id })
      : { tierKey: null };
    effectivePrice = calculateEffectivePrice(pricingConfig, {
      isMember: !!communityMembership,
      tierKey,
      aipBalance: communityMembership?.aip ?? 0,
    });
  } else if (pricingConfig && !session?.user?.id) {
    effectivePrice = calculateEffectivePrice(pricingConfig, { isMember: false, tierKey: null, aipBalance: 0 });
  }

  // Sequential — depends on myMembership.status
  let pendingPaymentCode: string | null = null;
  let renewalInfo: { originalAmountVnd: number; lateFeeVnd: number } | null = null;
  if (myMembership?.status === "PAYMENT_PENDING") {
    const now = new Date();
    const validPayment = await prisma.payment.findFirst({
      where: { refType: "challenge", refId: myMembership.id, status: "PENDING", expiresAt: { gt: now } },
      select: { paymentCode: true },
      orderBy: { createdAt: "desc" },
    });
    pendingPaymentCode = validPayment?.paymentCode ?? null;

    if (!pendingPaymentCode) {
      const originalPayment = await prisma.payment.findFirst({
        where: { refType: "challenge", refId: myMembership.id },
        orderBy: { createdAt: "asc" },
        select: { amountVnd: true },
      });
      const minutesSinceJoin = (Date.now() - myMembership.joinedAt.getTime()) / 60000;
      renewalInfo = {
        originalAmountVnd: Number(originalPayment?.amountVnd ?? effectivePrice?.vnd ?? 0),
        lateFeeVnd: computeChallengeLateFee(pricingConfig, minutesSinceJoin),
      };
    }
  }

  // Effective Day-1 start: real personalStartsAt, or joinedAt + grace if expired, else null.
  const effStart = myMembership
    ? effectivePersonalStartsAt(myMembership, challenge)
    : null;
  const autoStartDeadline =
    myMembership && challenge.autoStartAfterHours != null
      ? new Date(myMembership.joinedAt.getTime() + challenge.autoStartAfterHours * 3600_000)
      : null;

  const joinAction = joinChallengeAction.bind(null, {
    challengeId: challenge.id,
    communityId: challenge.community.id,
    communitySlug: slug,
    challengeSlug,
  });

  const dayNow = (() => {
    if (myMembership?.completedAt) return challenge.requiredDays;
    if (!effStart) return 0;
    const startDay = new Date(effStart);
    startDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsedDays = Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(challenge.requiredDays, Math.max(1, elapsedDays + 1));
  })();

  const currentTaskDeadlineLabel = effStart && dayNow > 0
    ? new Date(effStart.getTime() + dayNow * 24 * 60 * 60 * 1000).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
      })
    : undefined;

  // Compute per-task unlock status based on taskUnlockMode
  const unlockMode = challenge.taskUnlockMode ?? "DAILY";
  const defaultInterval = challenge.unlockIntervalHours ?? 24;
  const personalStart = effStart?.getTime() ?? 0;

  const tasks = challenge.tasks;

  // Cumulative hours from the member's personal start until task[idx] should open.
  const cumulativeUnlockHours = (idx: number): number => {
    let hours = 0;
    for (let i = 0; i < idx; i++) hours += tasks[i].unlockAfterHours ?? defaultInterval;
    return hours;
  };

  // Time gate (DAILY / DAILY_SEQUENTIAL): has the scheduled unlock moment passed?
  const isTimeGateOpen = (idx: number): boolean => {
    const cumulativeHours = cumulativeUnlockHours(idx);
    // For whole-day intervals, compare against midnight-normalized dayNow
    // so unlock is consistent with the displayed day number.
    const unlockAfterDays = cumulativeHours / 24;
    if (Number.isInteger(unlockAfterDays)) {
      return dayNow > unlockAfterDays;
    }
    // Non-whole-day intervals: fall back to raw timestamp comparison
    return Date.now() >= personalStart + cumulativeHours * 60 * 60 * 1000;
  };

  // Wall-clock moment (ms) task[idx]'s time gate opens — mirrors isTimeGateOpen
  // so the displayed time matches the actual unlock behavior exactly.
  const taskUnlockMomentMs = (idx: number): number => {
    const cumulativeHours = cumulativeUnlockHours(idx);
    const unlockAfterDays = cumulativeHours / 24;
    if (Number.isInteger(unlockAfterDays) && effStart) {
      // Whole-day intervals open at local midnight of (start day + N days).
      const midnightStart = new Date(effStart);
      midnightStart.setHours(0, 0, 0, 0);
      return midnightStart.getTime() + unlockAfterDays * 24 * 60 * 60 * 1000;
    }
    return personalStart + cumulativeHours * 60 * 60 * 1000;
  };

  function isTaskUnlocked(task: { dayNumber: number; unlockAfterHours: number | null }, taskIndex: number): boolean {
    if (!effStart) return false;
    if (myMembership?.completedAt) return true;

    switch (unlockMode) {
      case "ALL":
        return true;
      case "DAILY":
        return isTimeGateOpen(taskIndex);
      case "SEQUENTIAL": {
        if (taskIndex === 0) return true;
        const prevTask = tasks[taskIndex - 1];
        // Prev task must be APPROVED (not just submitted) to gate next in sequential mode.
        return approvedDayNumbers.has(prevTask.dayNumber);
      }
      case "DAILY_SEQUENTIAL": {
        // Both gates must pass: scheduled time reached AND previous task completed.
        if (!isTimeGateOpen(taskIndex)) return false;
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

  // Member-facing "mở lúc HH:mm DD/MM" for a task's scheduled unlock.
  const formatUnlockAt = (idx: number): string => {
    const ms = taskUnlockMomentMs(idx);
    const time = new Date(ms).toLocaleTimeString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const date = new Date(ms).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit",
    });
    return `${time} ${date}`;
  };

  // Reason a locked task is still locked, shown to the member.
  function lockReason(taskIndex: number): string {
    if (unlockMode === "SEQUENTIAL") {
      if (taskIndex > 0 && checkinByDay.get(tasks[taskIndex - 1].dayNumber)?.status === "PENDING") {
        return "chờ duyệt task trước để tiếp tục";
      }
      return "hoàn thành task trước để tiếp tục";
    }
    if (unlockMode === "MANUAL") return "chờ admin mở khóa";
    // Time-based modes: DAILY and DAILY_SEQUENTIAL.
    if (!effStart) return "chưa đến thời gian";
    if (unlockMode === "DAILY_SEQUENTIAL") {
      const prevDone = taskIndex === 0 || doneDayNumbers.has(tasks[taskIndex - 1].dayNumber);
      // Time already reached → the remaining blocker is the previous task.
      if (isTimeGateOpen(taskIndex) && !prevDone) return "hoàn thành task trước để tiếp tục";
    }
    return `mở lúc ${formatUnlockAt(taskIndex)}`;
  }

  const progressPct =
    challenge.requiredDays > 0
      ? Math.round((dayNow / challenge.requiredDays) * 100)
      : 0;

  return (
    <>
      <header className="view-header">
        <span className="view-title" title={challenge.title}>{challenge.title}</span>
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
                benefits: parseChallengeBenefits(challenge.benefits),
                difficulty: challenge.difficulty,
                autoStartAfterHours: challenge.autoStartAfterHours,
                freezeWindows: (challenge.freezeWindows as Array<{ label?: string; startsAt: string; endsAt: string }> | null) ?? null,
                bannerUrl: challenge.bannerUrl,
                bannerMediaType: challenge.bannerMediaType,
                bannerVideoUrl: challenge.bannerVideoUrl,
                featuredOnGlobal: challenge.featuredOnGlobal,
                pricingConfig: parsePricingConfig(challenge.pricingConfig),
                tiers: getTiersConfig(challenge.community.tiersConfig).map((t) => ({ key: t.key, label: t.label })),
                taskUnlockMode: challenge.taskUnlockMode,
                unlockIntervalHours: challenge.unlockIntervalHours,
                bumpProductId: (challenge as { bumpProductId?: string | null }).bumpProductId ?? null,
                aiReviewEnabled: challenge.aiReviewEnabled,
                aiReviewThreshold: challenge.aiReviewThreshold,
                aiReviewFallback: challenge.aiReviewFallback,
                aiReviewProvider: challenge.aiReviewProvider,
                aiReviewProviderId: challenge.aiReviewProviderId,
                aiReviewModel: challenge.aiReviewModel,
              }}
              communityProducts={communityProducts}
              aiProviders={aiProviders}
              pendingSubmissionsCount={submissionData?.pendingCount ?? 0}
            />
          )}

          <div className="ch-detail-header">
            <div
              className={`ch-detail-banner ${diffClass(challenge.difficulty)}`}
              style={
                !bannerVideo && challenge.bannerUrl
                  ? ({ ["--bg-img" as string]: `url("${challenge.bannerUrl}")` } as React.CSSProperties)
                  : undefined
              }
            >
              {bannerVideo && (
                <>
                  <iframe
                    className="ch-detail-banner-video"
                    src={bannerVideo.embedUrl}
                    title={`${challenge.title} video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <div className="ch-detail-banner-video-shade" />
                </>
              )}
              <div
                className="ch-diff-badge"
                style={{ position: "absolute", top: 14, left: 14, zIndex: 2 }}
              >
                {diffLabel(challenge.difficulty)}
              </div>
              {challenge.status !== "COMPLETED" && (
                <div
                  className={`ch-status-badge ${challenge.status === "ACTIVE" ? "active" : "open"}`}
                  style={{ position: "absolute", top: 14, right: 14, zIndex: 2 }}
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
                benefits: parseChallengeBenefits(challenge.benefits),
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
                      lateFeeVnd={renewalInfo.lateFeeVnd}
                    />
                  ) : null}
                </div>
              }
            />
          ) : myMembership?.status === "ACTIVE" && !effStart ? (
            <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div style={{ padding: "14px 18px", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 12, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
                Bạn đã tham gia challenge. Nhấn <strong>Bắt đầu</strong> khi sẵn sàng — đồng hồ đếm ngày sẽ chạy từ lúc này.
                {autoStartDeadline && (
                  <div style={{ marginTop: 6, fontSize: "var(--text-xs)", color: "var(--warning)" }}>
                    ⏱ Nếu không bấm, challenge sẽ tự bắt đầu lúc{" "}
                    <strong>
                      {autoStartDeadline.toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </strong>
                    .
                  </div>
                )}
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
                benefits: parseChallengeBenefits(challenge.benefits),
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
                  {effectivePrice && effectivePrice.vnd > 0 ? (
                    <JoinChallengeWithCoupon
                      communityId={challenge.community.id}
                      priceVnd={effectivePrice.vnd}
                      buyLabel={`🚀 Đăng ký ngay — ${Number(effectivePrice.vnd).toLocaleString("vi-VN")}đ`}
                      action={joinAction}
                    />
                  ) : (
                    <form action={joinAction}>
                      <button type="submit" className="ui-btn ui-btn-primary ui-btn-lg" style={{ width: "100%" }}>
                        🚀 Tham gia challenge — Miễn phí
                      </button>
                    </form>
                  )}
                  {effectivePrice?.canPayAip && (
                    <PayWithAipButton
                      challengeId={challenge.id}
                      communityId={challenge.community.id}
                      communitySlug={slug}
                      challengeSlug={challengeSlug}
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
                  {`${challenge.tasks.length} tasks`}
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
                const dayDeadline = effStart
                  ? new Date(effStart.getTime() + t.dayNumber * 24 * 60 * 60 * 1000)
                  : null;
                const isLate = !!(isDone && checkinData && dayDeadline && checkinData.createdAt.getTime() > dayDeadline.getTime());
                const hasBody = !!(t.description || t.sopContent || t.videoUrl || hasEvidenceHint || checkinData || isCurrent || isOverdue);
                // Determine if task is locked based on unlock mode
                const taskUnlocked = isDone || permissions.canManageChallenges || isTaskUnlocked(t, taskIndex);
                const isLocked = !taskUnlocked && !isDone && !isRejected && myMembership && !myMembership.completedAt;
                // When task is locked by the unlock mode, show locked placeholder
                if (isLocked && !permissions.canManageChallenges && myMembership && !myMembership.completedAt) {
                  return (
                    <div key={t.id} className="ch-task" style={{ opacity: 0.5, userSelect: "none" }}>
                      <div className="ch-task-head" style={{ cursor: "default" }}>
                        <div className="ch-task-day">{t.dayNumber}</div>
                        <div className="ch-task-info">
                          <div className="ch-task-label">Day {t.dayNumber}{t.label ? ` · ${t.label}` : ""}</div>
                          <div className="ch-task-title" style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
                            🔒 Chưa mở khóa — {lockReason(taskIndex)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                const giftUnlocked = isDone && !isPending && !isRejected;
                const showGift = !!(
                  t.giftLabel &&
                  (t.giftFileUrl || t.giftLinkUrl) &&
                  (giftUnlocked || permissions.canManageChallenges)
                );
                return (
                  <Fragment key={t.id}>
                  <details
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
                            aiReviewGuidelines: t.aiReviewGuidelines ?? null,
                            aiReviewRedFlags: t.aiReviewRedFlags ?? null,
                            giftLabel: t.giftLabel ?? null,
                            giftFileUrl: t.giftFileUrl ?? null,
                            giftLinkUrl: t.giftLinkUrl ?? null,
                          }}
                        />
                      )}
                    </summary>
                    {hasBody && (
                      <div className="ch-task-body">
                        {t.description && <SopContent content={t.description} className="ch-task-desc" />}
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
                            <SopContent content={t.sopContent} />
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
                                {checkinData.aiReviewData && (
                                  <AgentReviewCard
                                    data={checkinData.aiReviewData as AIReviewData}
                                    status={checkinData.status}
                                  />
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
                                    evidenceType={t.evidenceType}
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
                  {showGift && (
                    <TaskGiftStrip
                      taskId={t.id}
                      dayNumber={t.dayNumber}
                      label={t.giftLabel ?? ""}
                      fileUrl={t.giftFileUrl}
                      linkUrl={t.giftLinkUrl}
                    />
                  )}
                  </Fragment>
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
                aiFlaggedCount={submissionData.aiFlaggedCount}
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
