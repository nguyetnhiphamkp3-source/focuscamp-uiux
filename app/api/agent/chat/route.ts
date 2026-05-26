import { NextResponse } from "next/server";
import { streamText, convertToModelMessages, stepCountIs, type UIMessage } from "ai";
import { buildModel, DEFAULT_MODELS } from "@/lib/ai-model";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  appendMessage,
  checkQuota,
  getAgentApiKey,
  getAgentProvider,
  getAgentModel,
  getOrCreateConversation,
  getSystemPrompt,
} from "@/lib/services/agent";
import { buildChatAgentTools } from "@/lib/agent-tools";
import { effectiveCommunityRole } from "@/lib/community-permissions";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs"; // streaming + prisma both supported
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  communityId: string;
  conversationId?: string;
  messages: UIMessage[];
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 streams / minute / user
  const rl = await rateLimit({
    key: `agent-chat:${s.user.id}`,
    limit: 30,
    windowSec: 60,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body?.communityId || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Membership check
  const membership = await prisma.membership.findUnique({
    where: {
      userId_communityId: { userId: s.user.id, communityId: body.communityId },
    },
    select: { tier: true, role: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  const isPaid = membership.tier !== "EXPLORER";

  const community = await prisma.community.findUnique({
    where: { id: body.communityId },
    select: { ownerId: true },
  });
  const role = effectiveCommunityRole({
    isOwner: community?.ownerId === s.user.id,
    membershipRole: membership.role,
  });
  const quota = await checkQuota(s.user.id, isPaid);
  if (!quota.ok) {
    return NextResponse.json(
      { error: "quota_exceeded", message: quota.reason },
      { status: 429 },
    );
  }

  const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser
    ? lastUser.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("")
    : "";
  if (!lastUserText) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const conversation = await getOrCreateConversation({
    userId: s.user.id,
    communityId: body.communityId,
    conversationId: body.conversationId,
  });

  // Persist user message before streaming
  await appendMessage({
    conversationId: conversation.id,
    role: "user",
    content: lastUserText,
  });

  const systemPrompt = await getSystemPrompt(body.communityId);

  const apiKey = await getAgentApiKey(body.communityId);
  if (!apiKey) {
    return NextResponse.json(
      { error: "agent_not_configured", message: "Chủ cộng đồng chưa cấu hình API key cho AI Agent." },
      { status: 503 },
    );
  }

  const provider = await getAgentProvider(body.communityId);
  const storedModel = await getAgentModel(body.communityId);
  const modelId = storedModel ?? DEFAULT_MODELS[provider] ?? DEFAULT_MODELS.anthropic;

  const model = buildModel(provider, apiKey, modelId);
  const modelMessages = await convertToModelMessages(body.messages);
  const tools = buildChatAgentTools(body.communityId, s.user.id, role);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: modelMessages,
    tools,
    stopWhen: stepCountIs(3),
    temperature: 0.7,
    maxOutputTokens: 2048,
    onFinish: async ({ text }) => {
      try {
        await appendMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: text,
        });
      } catch (err) {
        logger.warn(
          { err, conversationId: conversation.id },
          "[agent] persist assistant message failed",
        );
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "x-conversation-id": conversation.id,
    },
  });
}
