import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getPillars,
  getClasses,
  getCurrency,
  getLevelTiers,
  getUiConfig,
  getPaymentConfig,
} from "@/lib/community-config";
import {
  effectiveCommunityRole,
  communityPermissionFlags,
} from "@/lib/community-permissions";
import { PillarsEditor } from "@/components/settings/pillars-editor";
import { ClassesEditor } from "@/components/settings/classes-editor";
import { CurrencyEditor } from "@/components/settings/currency-editor";
import { LevelsEditor } from "@/components/settings/levels-editor";
import { MembersEditor } from "@/components/settings/members-editor";
import { CommunityInfoEditor } from "@/components/settings/community-info-editor";
import { CommunityStatsCard } from "@/components/settings/community-stats-card";
import { TiersEditor } from "@/components/settings/tiers-editor";
import { UiConfigEditor } from "@/components/settings/ui-config-editor";
import { CommunityPlanPanel } from "@/components/settings/community-plan-panel";
import { AgentConfigEditor } from "@/components/settings/agent-config-editor";
import { listAIProviders } from "@/lib/services/ai-provider";
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { AgentActivityPanel } from "@/components/settings/agent-activity-panel";
import { listApiKeys } from "@/app/actions/api-keys";
import { AffiliateConfigEditor } from "@/components/settings/affiliate-config-editor";
import { getAffiliateConfig } from "@/lib/services/affiliate";
import { ChannelConfigEditor } from "@/components/settings/channel-config-editor";
import { normalizeChannelConfig } from "@/lib/channel-config";
import { PaymentConfigEditor } from "@/components/settings/payment-config-editor";
import { getPlanStatus } from "@/lib/platform-plans";
import { getTiersConfig } from "@/lib/services/subscription";
import { listMembers } from "@/lib/services/community-settings";
import { DangerZone } from "@/components/settings/danger-zone";
import { SlugChangeEditor } from "@/components/settings/slug-change-editor";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const isOwner = community.ownerId === session.user.id;

  const membership = !isOwner
    ? await prisma.membership.findUnique({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
        select: { role: true },
      })
    : null;

  const role = effectiveCommunityRole({
    isOwner,
    membershipRole: membership?.role,
  });
  const perms = communityPermissionFlags(role);

  if (!perms.canManageSettings) redirect(`/c/${slug}`);

  const tabs = [
    { slug: "general", label: "Tổng quan", visible: perms.canManageSettings },
    { slug: "billing", label: "Thanh toán", visible: perms.canManageBilling },
    { slug: "content", label: "Nội dung", visible: perms.canManageSettings },
    { slug: "integrations", label: "Tích hợp", visible: perms.canManageAiAgent || perms.canManageApiKeys },
    { slug: "members", label: "Thành viên", visible: perms.canViewMembers },
  ].filter((t) => t.visible);

  const tab = tabs.find((t) => t.slug === tabParam)?.slug ?? tabs[0]?.slug ?? "general";

  // Sync getters (read from community object, no DB call)
  const pillars = getPillars(community);
  const classes = getClasses(community);
  const currency = getCurrency(community);
  const tiers = getLevelTiers(community);
  const subscriptionTiers = getTiersConfig(community.tiersConfig);
  const uiConfig = getUiConfig(community);
  const planState = getPlanStatus(community);

  // Async queries — only fetch for active tab
  const apiKeys = tab === "integrations" && perms.canManageApiKeys ? await listApiKeys(community.id) : [];
  const aiProviders =
    tab === "integrations" && perms.canManageAiAgent
      ? await listAIProviders(session.user.id, community.id)
      : [];
  const { members, total } =
    tab === "members" && perms.canViewMembers
      ? await listMembers({ communityId: community.id, limit: 100 })
      : { members: [], total: 0 };
  // Challenge list for per-channel notification routing
  const notifyChallenges =
    tab === "integrations" && perms.canManageApiKeys
      ? await prisma.challenge.findMany({
          where: { communityId: community.id },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
        })
      : [];

  return (
    <>
      <header className="view-header">
        <span className="view-title">Community Settings</span>
        <span className="view-subtitle">{community.name}</span>
      </header>

      <div className="settings-tabs-bar">
        {tabs.map((t) => (
          <Link
            key={t.slug}
            href={`/c/${slug}/settings?tab=${t.slug}`}
            className={`settings-tab ${tab === t.slug ? "active" : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="settings-page-scroll">
        <div className="settings-page-inner">
          {!isOwner && tab === "general" && (
            <div
              style={{
                background: "var(--info-soft, rgba(59,130,246,0.1))",
                border: "1px solid var(--info, #3b82f6)",
                borderRadius: "var(--r-md)",
                padding: "var(--space-3)",
                color: "var(--info, #3b82f6)",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-4)",
              }}
            >
              Bạn đang xem với quyền Admin. Bạn có thể xem và chỉnh cài đặt; chỉ chủ cộng đồng mới xoá cộng đồng.
            </div>
          )}

          {/* Tab: Tổng quan */}
          {tab === "general" && (
            <>
              {perms.canManageSettings && (
                <CommunityInfoEditor
                  communityId={community.id}
                  communitySlug={slug}
                  initial={{
                    name: community.name,
                    tagline: community.tagline,
                    description: community.description,
                    category: community.category,
                    featuredOnGlobal: community.featuredOnGlobal,
                    bannerUrl: community.bannerUrl,
                    iconUrl: community.iconUrl,
                    introVideoUrl: community.introVideoUrl,
                    introGallery: community.introGallery,
                  }}
                />
              )}

              {perms.canManageSettings && (
                <SlugChangeEditor
                  communityId={community.id}
                  currentSlug={slug}
                  slugChangedAt={community.slugChangedAt}
                />
              )}

              {perms.canManageSettings && (
                <UiConfigEditor
                  communityId={community.id}
                  communitySlug={slug}
                  initial={{ hiddenFeatures: uiConfig.hiddenFeatures }}
                />
              )}

              {perms.canManageSettings && <CommunityStatsCard communityId={community.id} />}

              <div
                className="ui-card"
                style={{
                  marginBottom: "var(--space-4)",
                  padding: "var(--space-4) var(--space-5)",
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: 20,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  Slug: <code>{community.slug}</code>
                </span>
                <span>
                  <strong style={{ color: "var(--text-heading)" }}>
                    {community.memberCount}
                  </strong>{" "}
                  thành viên
                </span>
                <span>
                  Tạo {community.createdAt.toLocaleDateString("vi-VN")}
                </span>
              </div>

              {isOwner && (
                <>
                  <div
                    style={{
                      fontSize: "var(--text-xl)",
                      fontWeight: 700,
                      color: "var(--danger)",
                      padding: "var(--space-6) 0 var(--space-3)",
                      borderTop: "1px solid var(--danger)",
                      marginTop: "var(--space-4)",
                    }}
                  >
                    Danger Zone
                  </div>
                  <DangerZone
                    communityId={community.id}
                    communitySlug={slug}
                    communityName={community.name}
                  />
                </>
              )}
            </>
          )}

          {/* Tab: Thanh toán */}
          {tab === "billing" && (
            <>
              {perms.canManageBilling && (
                <CommunityPlanPanel communityId={community.id} state={planState} />
              )}

              {perms.canManageBilling && (
                <PaymentConfigEditor
                  communityId={community.id}
                  communitySlug={slug}
                  initial={getPaymentConfig(community)}
                />
              )}

              {perms.canManageOrders && (
                <div
                  className="ui-card settings-action-card"
                  style={{
                    marginBottom: "var(--space-4)",
                    padding: "var(--space-4) var(--space-5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-4)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--header-primary)", fontSize: "var(--text-base)" }}>
                      Đơn hàng
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>
                      Xem và quản lý các đơn hàng từ marketplace
                    </div>
                  </div>
                  <Link
                    href={`/c/${slug}/orders`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--brand-green)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "var(--text-sm)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Xem đơn hàng →
                  </Link>
                </div>
              )}

              {perms.canManageCoupons && (
                <div
                  className="ui-card settings-action-card"
                  style={{
                    marginBottom: "var(--space-4)",
                    padding: "var(--space-4) var(--space-5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--space-4)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--header-primary)", fontSize: "var(--text-base)" }}>
                      Mã giảm giá
                    </div>
                    <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 2 }}>
                      Tạo và quản lý coupon cho sản phẩm, challenge, sự kiện
                    </div>
                  </div>
                  <Link
                    href={`/c/${slug}/settings/coupons`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--brand-green)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "var(--text-sm)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Quản lý coupon →
                  </Link>
                </div>
              )}

              {perms.canManageSettings && (
                <>
                  <div
                    style={{
                      fontSize: "var(--text-xl)",
                      fontWeight: 700,
                      color: "var(--header-primary)",
                      padding: "var(--space-6) 0 var(--space-3)",
                      borderTop: "1px solid var(--border-subtle)",
                      marginTop: "var(--space-4)",
                    }}
                  >
                    Subscription Tiers
                  </div>
                  <TiersEditor
                    tiers={subscriptionTiers}
                    communityId={community.id}
                    communitySlug={slug}
                  />
                </>
              )}
            </>
          )}

          {/* Tab: Nội dung */}
          {tab === "content" && (
            <>
              <div
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  marginBottom: "var(--space-4)",
                }}
              >
                {`Tuỳ chỉnh "ngôn ngữ" riêng cho cộng đồng của bạn: chủ đề (pillars), vai trò thành viên (classes), đồng điểm (currency), các bậc level (tiers). Mỗi cộng đồng có taxonomy riêng, không bị ảnh hưởng bởi cộng đồng khác.`}
              </div>

              <PillarsEditor
                communityId={community.id}
                communitySlug={slug}
                initial={pillars}
              />
              <ClassesEditor
                communityId={community.id}
                communitySlug={slug}
                initial={classes}
              />
              <CurrencyEditor
                communityId={community.id}
                communitySlug={slug}
                initial={currency}
              />
              <LevelsEditor
                communityId={community.id}
                communitySlug={slug}
                initial={tiers}
              />

              {perms.canManageSettings && (
                <AffiliateConfigEditor
                  communityId={community.id}
                  communitySlug={slug}
                  initial={getAffiliateConfig(community)}
                />
              )}
            </>
          )}

          {/* Tab: Tích hợp */}
          {tab === "integrations" && (
            <>
              {perms.canManageAiAgent && (
                <AgentConfigEditor
                  communityId={community.id}
                  communitySlug={slug}
                  initial={{
                    prompt: community.agentSystemPrompt ?? "",
                    hasApiKey: !!community.agentApiKey,
                    provider: (community.agentProvider ?? "anthropic") as "anthropic" | "openai" | "groq" | "xai" | "google",
                    model: community.agentModel ?? null,
                    agentName: community.agentName,
                    agentAvatarUrl: community.agentAvatarUrl,
                    agentTagline: community.agentTagline,
                    chatProviderId: community.agentProviderId,
                    reviewProviderId: community.agentReviewProviderId,
                    reviewModel: community.agentReviewModel,
                    providers: aiProviders,
                    communityName: community.name,
                  }}
                />
              )}

              {perms.canManageApiKeys && (
                <ApiKeysPanel
                  communityId={community.id}
                  communitySlug={slug}
                  initial={apiKeys}
                />
              )}

              {perms.canManageApiKeys &&
                (() => {
                  const cfg = normalizeChannelConfig(community.channelConfig);
                  return (
                    <ChannelConfigEditor
                      communityId={community.id}
                      communitySlug={slug}
                      challenges={notifyChallenges}
                      initial={{
                        discord: cfg.discord.map((d) => ({
                          webhookUrl: d.webhookUrl,
                          eventTypes: d.eventTypes,
                          challengeIds: d.challengeIds ?? [],
                        })),
                        // Never send bot tokens to the client — only a "hasToken" flag.
                        telegram: cfg.telegram.map((t) => ({
                          id: t.id,
                          hasToken: !!t.botToken,
                          chatId: t.chatId,
                          topicId: t.topicId ?? "",
                          eventTypes: t.eventTypes,
                          challengeIds: t.challengeIds ?? [],
                        })),
                        templates: cfg.templates ?? {},
                      }}
                    />
                  );
                })()}

              {perms.canManageAiAgent && <AgentActivityPanel communityId={community.id} />}
            </>
          )}

          {/* Tab: Thành viên */}
          {tab === "members" && (
            <>
              {perms.canViewMembers && (
                <MembersEditor
                  communityId={community.id}
                  communitySlug={slug}
                  members={members.map((m) => ({
                    userId: m.userId,
                    role: m.role,
                    tier: m.tier,
                    className: m.className,
                    xp: m.xp,
                    level: m.level,
                    joinedAt: m.joinedAt,
                    lastActiveAt: m.lastActiveAt,
                    user: m.user,
                  }))}
                  total={total}
                  canManageRoles={perms.canManageRoles}
                  ownerId={community.ownerId}
                  currentUserId={session.user.id}
                  classes={classes}
                  levelTiers={tiers}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
