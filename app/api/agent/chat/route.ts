import { NextResponse } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  appendMessage,
  checkQuota,
  getOrCreateConversation,
  getSystemPrompt,
} from "@/lib/services/agent";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs"; // streaming + prisma both supported
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  communityId: string;
  conversationId?: string;
  messages: UIMessage[];
}

const MODEL_ID = process.env.AGENT_MODEL || "claude-haiku-4-5-20251001";

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
    select: { tier: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "not_a_member" }, { status: 403 });
  }

  const isPaid = membership.tier !== "EXPLORER";
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "agent_not_configured", message: "ANTHROPIC_API_KEY chưa set" },
      { status: 503 },
    );
  }

  const modelMessages = await convertToModelMessages(body.messages);

  const result = streamText({
    model: anthropic(MODEL_ID),
    system: systemPrompt,
    messages: modelMessages,
    temperature: 0.7,
    maxOutputTokens: 1024,
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
