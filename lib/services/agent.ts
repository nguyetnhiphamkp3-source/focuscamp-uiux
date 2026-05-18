/**
 * AI Agent service — per-community chat assistant.
 *
 * v1 scope:
 *   - Streaming reply via Anthropic (Claude Haiku 4.5 default for cost)
 *   - System prompt configured by community owner
 *   - Persistent conversations + messages in DB
 *   - Per-user daily quota (50 messages / day for EXPLORER tier, unlimited for paid)
 *
 * Out of scope v1: tool calling, RAG over community content, multi-turn agents.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { assertCommunityPermission } from "@/lib/services/community-settings";

const DAILY_QUOTA_FREE = 50;

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
    if (existing && existing.userId === input.userId) return existing;
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
}

export async function listMessages(conversationId: string, limit = 50) {
  return prisma.agentMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
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

export function defaultSystemPrompt(communityName: string): string {
  return `Bạn là AI Agent của cộng đồng "${communityName}" trên focus.camp — nền tảng cộng đồng challenge-first.

Trả lời bằng tiếng Việt, ngắn gọn, có hành động cụ thể. Tone gần gũi, không formal cứng. Khi user hỏi về challenge / habit / build kỷ luật, đưa lời khuyên thực tế — không phải general motivation.

Nếu user hỏi vượt phạm vi cộng đồng (vd code, kiến thức học thuật xa lạ), hãy giúp trong khả năng nhưng nhắc rằng bạn được tối ưu cho hành trình của họ trong cộng đồng này.`;
}

export async function getSystemPrompt(communityId: string): Promise<string> {
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { name: true, agentSystemPrompt: true },
  });
  if (!c) return "";
  if (c.agentSystemPrompt && c.agentSystemPrompt.trim()) {
    return c.agentSystemPrompt;
  }
  return defaultSystemPrompt(c.name);
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
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { agentApiKey: true },
  });
  return c?.agentApiKey ?? null;
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
  const c = await prisma.community.findUnique({
    where: { id: communityId },
    select: { agentApiKey: true },
  });
  return !!(c?.agentApiKey?.trim());
}
