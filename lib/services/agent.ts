/**
 * AI Agent service — per-community chat assistant.
 *
 *   - Streaming reply via Anthropic (Claude Haiku 4.5 default for cost)
 *   - System prompt configured by community owner
 *   - Persistent conversations + messages in DB
 *   - Per-user daily quota (50 messages / day for EXPLORER tier, unlimited for paid)
 *   - Read-only tool calling (community data: challenges, members, stats, posts, XP)
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertCommunityPermission } from "@/lib/services/community-settings";
import { DEFAULT_MODELS } from "@/lib/ai-model";
import {
  providerTypeLabel,
  resolveAIProviderConfig,
  type ResolvedAIModelConfig,
} from "@/lib/services/ai-provider";

const DAILY_QUOTA_FREE = 50;
const MAX_MESSAGES_PER_CONVERSATION = 100;

/**
 * Count messages this user sent in last 24h across all conversations.
 * Used for free-tier quota gate.
 */
export async function countUserAgentMessagesToday(userId: string): Promise<number> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.agentMessage.count({
    where: {
      role: "user",
      createdAt: { gte: yesterday },
      conversation: { userId },
    },
  });
}

export async function checkQuota(
  userId: string,
  isPaidMember: boolean,
): Promise<{ ok: true } | { ok: false; reason: string; remaining: 0 }> {
  if (isPaidMember) return { ok: true };
  const used = await countUserAgentMessagesToday(userId);
  if (used >= DAILY_QUOTA_FREE) {
    return {
      ok: false,
      reason: `Đã hết quota ${DAILY_QUOTA_FREE} tin nhắn/ngày cho gói EXPLORER`,
      remaining: 0,
    };
  }
  return { ok: true };
}

export async function getOrCreateConversation(input: {
  userId: string;
  communityId: string;
  conversationId?: string;
  channel?: "web" | "telegram";
}) {
  const channel = input.channel ?? "web";
  if (input.conversationId) {
    const existing = await prisma.agentConversation.findUnique({
      where: { id: input.conversationId },
    });
    if (
      existing &&
      existing.userId === input.userId &&
      existing.communityId === input.communityId
    ) {
      return existing;
    }
  }
  // For telegram, reuse latest conversation per (user, community, telegram channel)
  if (channel === "telegram") {
    const existing = await prisma.agentConversation.findFirst({
      where: { userId: input.userId, communityId: input.communityId, channel: "telegram" },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return existing;
  }
  return prisma.agentConversation.create({
    data: {
      userId: input.userId,
      communityId: input.communityId,
      channel,
    },
  });
}

export async function appendMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
}) {
  await prisma.agentMessage.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    },
  });
  await prisma.agentConversation.update({
    where: { id: input.conversationId },
    data: { updatedAt: new Date() },
  });
  try {
    await pruneConversationMessages(input.conversationId);
  } catch (err) {
    logger.warn(
      { err, conversationId: input.conversationId },
      "[agent] prune old messages failed",
    );
  }
}

export async function listMessages(conversationId: string, limit = 50) {
  const messages = await prisma.agentMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return messages.reverse();
}

async function pruneConversationMessages(conversationId: string) {
  const overflow = await prisma.agentMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    skip: MAX_MESSAGES_PER_CONVERSATION,
    select: { id: true },
  });
  if (overflow.length === 0) return;

  await prisma.agentMessage.deleteMany({
    where: { id: { in: overflow.map((m) => m.id) } },
  });
}

export async function listConversations(userId: string, communityId: string) {
  return prisma.agentConversation.findMany({
    where: { userId, communityId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });
}

export function defaultSystemPrompt(communityName: string, agentName?: string | null): string {
  const name = agentName?.trim() || "AI Agent";
  return `Bạn là ${name}, AI Agent của cộng đồng "${communityName}" trên focus.camp — nền tảng cộng đồng challenge-first.

Trả lời bằng tiếng Việt, ngắn gọn, có hành động cụ thể. Tone gần gũi, không formal cứng. Khi user hỏi về challenge / habit / build kỷ luật, đưa lời khuyên thực tế — không phải general motivation.

Nếu user hỏi vượt phạm vi cộng đồng (vd code, kiến thức học thuật xa lạ), hãy giúp trong khả năng nhưng nhắc rằng bạn được tối ưu cho hành trình của họ trong cộng đồng này.`;
}

export async function getSystemPrompt(communityId: string): Promise<string> {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, agentName: true, agentSystemPrompt: true },
  });
  if (!c) return "";
  if (c.agentSystemPrompt && c.agentSystemPrompt.trim()) {
    return c.agentSystemPrompt;
  }
  return defaultSystemPrompt(c.name, c.agentName);
}

export async function getAgentProfile(communityId: string) {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      name: true,
      iconUrl: true,
      agentName: true,
      agentAvatarUrl: true,
      agentTagline: true,
    },
  });
  if (!c) {
    return { name: "AI Agent", avatarUrl: null, tagline: null };
  }
  return {
    name: c.agentName?.trim() || `${c.name} Agent`,
    avatarUrl: c.agentAvatarUrl || c.iconUrl || null,
    tagline: c.agentTagline,
  };
}

export async function updateAgentProfile(input: {
  userId: string;
  communityId: string;
  name: string;
  avatarUrl?: string | null;
  tagline?: string | null;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new Error("Agent name is required");
  await prisma.community.update({
    where: { id: input.communityId },
    data: {
      agentName: name,
      agentAvatarUrl: input.avatarUrl?.trim() || null,
      agentTagline: input.tagline?.trim().slice(0, 160) || null,
    },
  });
  logger.info({ communityId: input.communityId }, "[agent] profile updated");
}

export async function setSystemPrompt(input: {
  userId: string;
  communityId: string;
  prompt: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  const trimmed = input.prompt.trim();
  if (trimmed.length > 4000) {
    throw new Error("System prompt tối đa 4000 ký tự");
  }
  await prisma.community.update({
    where: { id: input.communityId },
    data: { agentSystemPrompt: trimmed || null },
  });
  logger.info({ communityId: input.communityId }, "[agent] system prompt updated");
}

export async function getAgentApiKey(communityId: string): Promise<string | null> {
  const resolved = await getAgentModelConfig(communityId);
  return resolved?.apiKey ?? null;
}

export async function setAgentApiKey(input: {
  userId: string;
  communityId: string;
  apiKey: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  const trimmed = input.apiKey.trim();
  await prisma.community.update({
    where: { id: input.communityId },
    data: { agentApiKey: trimmed || null },
  });
  logger.info({ communityId: input.communityId }, "[agent] API key updated");
}

export async function hasAgentApiKey(communityId: string): Promise<boolean> {
  const resolved = await getAgentModelConfig(communityId);
  return !!resolved?.apiKey;
}

export async function getAgentProvider(communityId: string): Promise<string> {
  const resolved = await getAgentModelConfig(communityId);
  if (resolved) return resolved.providerType;
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { agentProvider: true },
  });
  return c?.agentProvider ?? "anthropic";
}

export async function setAgentProvider(input: {
  userId: string;
  communityId: string;
  provider: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  await prisma.community.update({
    where: { id: input.communityId },
    data: { agentProvider: input.provider },
  });
  logger.info({ communityId: input.communityId, provider: input.provider }, "[agent] provider updated");
}

export async function getAgentModel(communityId: string): Promise<string | null> {
  const resolved = await getAgentModelConfig(communityId);
  if (resolved) return resolved.modelId;
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { agentModel: true },
  });
  return c?.agentModel ?? null;
}

export async function setAgentModel(input: {
  userId: string;
  communityId: string;
  model: string;
}) {
  await assertCommunityPermission(input.userId, input.communityId, "manage_ai_agent");
  await prisma.community.update({
    where: { id: input.communityId },
    data: { agentModel: input.model },
  });
  logger.info({ communityId: input.communityId, model: input.model }, "[agent] model updated");
}

export async function getAgentModelConfig(
  communityId: string,
): Promise<ResolvedAIModelConfig | null> {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      agentProviderId: true,
      agentModel: true,
      agentApiKey: true,
      agentProvider: true,
    },
  });
  if (!c) return null;

  const providerConfig = await resolveAIProviderConfig({
    communityId,
    providerId: c.agentProviderId,
    modelId: c.agentModel,
  });
  if (providerConfig) return providerConfig;
  if (c.agentProviderId) return null;

  if (!c.agentApiKey?.trim()) return null;
  const providerType = c.agentProvider ?? "anthropic";
  return {
    providerId: null,
    providerType: providerType as ResolvedAIModelConfig["providerType"],
    apiKey: c.agentApiKey,
    modelId:
      c.agentModel ??
      DEFAULT_MODELS[providerType] ??
      DEFAULT_MODELS.anthropic,
    baseUrl: null,
    providerDisplayName: providerTypeLabel(providerType),
  };
}

export async function getAgentReviewModelConfig(input: {
  communityId: string;
  challengeProviderId?: string | null;
  challengeModel?: string | null;
  legacyProvider?: string | null;
}): Promise<ResolvedAIModelConfig | null> {
  const c = await prisma.community.findUnique({
    where: { id: input.communityId },
    select: {
      agentReviewProviderId: true,
      agentReviewModel: true,
      agentProviderId: true,
      agentModel: true,
      agentApiKey: true,
      agentProvider: true,
    },
  });
  if (!c) return null;

  const configuredProviderId =
    input.challengeProviderId ?? c.agentReviewProviderId ?? c.agentProviderId;
  const configuredModel =
    input.challengeModel ?? c.agentReviewModel ?? c.agentModel;

  const providerConfig = await resolveAIProviderConfig({
    communityId: input.communityId,
    providerId: configuredProviderId,
    modelId: configuredModel,
  });
  if (providerConfig) return providerConfig;
  if (configuredProviderId) return null;

  if (!c.agentApiKey?.trim()) return null;
  const providerType = input.legacyProvider ?? c.agentProvider ?? "anthropic";
  return {
    providerId: null,
    providerType: providerType as ResolvedAIModelConfig["providerType"],
    apiKey: c.agentApiKey,
    modelId:
      configuredModel ??
      DEFAULT_MODELS[providerType] ??
      DEFAULT_MODELS.anthropic,
    baseUrl: null,
    providerDisplayName: providerTypeLabel(providerType),
  };
}
