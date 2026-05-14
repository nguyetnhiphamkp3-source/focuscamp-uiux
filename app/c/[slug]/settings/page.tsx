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
} from "@/lib/community-config";
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
import { ApiKeysPanel } from "@/components/settings/api-keys-panel";
import { AgentActivityPanel } from "@/components/settings/agent-activity-panel";
import { listApiKeys } from "@/app/actions/api-keys";
import { AffiliateConfigEditor } from "@/components/settings/affiliate-config-editor";
import { getAffiliateConfig } from "@/lib/services/affiliate";
import { ChannelConfigEditor } from "@/components/settings/channel-config-editor";
import { getPlanStatus } from "@/lib/platform-plans";
import { getTiersConfig } from "@/lib/services/subscription";
import { listMembers } from "@/lib/services/community-settings";
import { DangerZone } from "@/components/settings/danger-zone";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const community = await prisma.community.findUnique({ where: { slug } });
  if (!community) notFound();

  const isOwner = community.ownerId === session.user.id;

  const pillars = getPillars(community);
  const classes = getClasses(community);
  const currency = getCurrency(community);
  const tiers = getLevelTiers(community);
  const subscriptionTiers = getTiersConfig(community.tiersConfig);
  const uiConfig = getUiConfig(community);
  const planState = getPlanStatus(community);
  const apiKeys = isOwner ? await listApiKeys(community.id) : [];

  const { members, total } = await listMembers({
    communityId: community.id,
    limit: 100,
  });

  return (
    <>
      <header className="view-header">
        <span className="view-title">Community Settings</span>
        <span className="view-subtitle">{community.name}</span>
      </header>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-6) var(--space-8)",
        }}
      >
        <div style={{ maxWidth: 860 }}>
          {!isOwner && (
            <div
              style={{
                background: "var(--danger-soft)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--r-md)",
                padding: "var(--space-3)",
                color: "var(--danger)",
                fontSize: "var(--text-sm)",
                marginBottom: "var(--space-4)",
              }}
            >
              ⚠️ Bạn không phải chủ cộng đồng. Chỉ xem read-only.
            </div>
          )}

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
            }}
            disabled={!isOwner}
          />

          {isOwner && (
            <CommunityPlanPanel communityId={community.id} state={planState} />
          )}

          {isOwner && (
            <div
              className="ui-card"
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

          {isOwner && (
            <UiConfigEditor
              communityId={community.id}
              communitySlug={slug}
              initial={{ hiddenFeatures: uiConfig.hiddenFeatures }}
            />
          )}

          {isOwner && (
            <AgentConfigEditor
              communityId={community.id}
              communitySlug={slug}
              initial={{ prompt: community.agentSystemPrompt ?? "" }}
            />
          )}

          {isOwner && (
            <ApiKeysPanel
              communityId={community.id}
              communitySlug={slug}
              initial={apiKeys}
            />
          )}

          {isOwner && (
            <AffiliateConfigEditor
              communityId={community.id}
              communitySlug={slug}
              initial={getAffiliateConfig(community)}
            />
          )}

          {isOwner &&
            (() => {
              const cfg = (community.channelConfig ?? {}) as {
                discord?: { webhookUrl: string; eventTypes: string[] };
                telegram?: { chatId: string; eventTypes: string[] };
              };
              return (
                <ChannelConfigEditor
                  communityId={community.id}
                  communitySlug={slug}
                  initial={{
                    discord: cfg.discord ?? null,
                    telegram: cfg.telegram
                      ? {
                          chatId: cfg.telegram.chatId,
                          eventTypes: cfg.telegram.eventTypes,
                        }
                      : null,
                  }}
                />
              );
            })()}

          {isOwner && <AgentActivityPanel communityId={community.id} />}

          {isOwner && <CommunityStatsCard communityId={community.id} />}

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
            Concept
          </div>
          <div
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              marginBottom: "var(--space-4)",
            }}
          >
            Tuỳ chỉnh “ngôn ngữ” riêng cho cộng đồng của bạn: chủ đề (pillars),
            vai trò thành viên (classes), đồng điểm (currency), các bậc level
            (tiers). Mỗi cộng đồng có taxonomy riêng, không bị ảnh hưởng bởi
            cộng đồng khác.
          </div>

          <PillarsEditor
            communityId={community.id}
            communitySlug={slug}
            initial={pillars}
            disabled={!isOwner}
          />
          <ClassesEditor
            communityId={community.id}
            communitySlug={slug}
            initial={classes}
            disabled={!isOwner}
          />
          <CurrencyEditor
            communityId={community.id}
            communitySlug={slug}
            initial={currency}
            disabled={!isOwner}
          />
          <LevelsEditor
            communityId={community.id}
            communitySlug={slug}
            initial={tiers}
            disabled={!isOwner}
          />

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
            disabled={!isOwner}
          />

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
            Thành viên
          </div>
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
              user: m.user,
            }))}
            total={total}
            isOwner={isOwner}
            ownerId={community.ownerId}
            currentUserId={session.user.id}
            classes={classes}
            levelTiers={tiers}
          />

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
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "var(--space-2) 0",
        borderBottom: "1px solid var(--border-subtle)",
        fontSize: "var(--text-base)",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong style={{ color: "var(--text-heading)" }}>{value}</strong>
    </div>
  );
}
