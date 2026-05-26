import { NextResponse } from "next/server";
import { generateText, type LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGroq } from "@ai-sdk/groq";
import { createXai } from "@ai-sdk/xai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { auth } from "@/auth";
import { getAgentApiKey } from "@/lib/services/agent";
import { assertCommunityPermission } from "@/lib/services/community-settings";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildModel(
  provider: string,
  apiKey: string,
  modelId: string,
): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "groq":
      return createGroq({ apiKey })(modelId);
    case "xai":
      return createXai({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "anthropic":
    default:
      return createAnthropic({ apiKey })(modelId);
  }
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json(
      { ok: false, error: "Chưa đăng nhập" },
      { status: 401 },
    );
  }

  const rl = await rateLimit({
    key: `agent-validate:${s.user.id}`,
    limit: 10,
    windowSec: 60,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Quá nhiều lần kiểm tra, thử lại sau 1 phút" },
      { status: 429 },
    );
  }

  let body: {
    communityId: string;
    provider: string;
    model: string;
    apiKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  if (!body.communityId || !body.provider || !body.model) {
    return NextResponse.json(
      { ok: false, error: "Thiếu thông tin" },
      { status: 400 },
    );
  }

  // Permission check
  try {
    await assertCommunityPermission(
      s.user.id,
      body.communityId,
      "manage_ai_agent",
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Không có quyền" },
      { status: 403 },
    );
  }

  // Use provided API key, or fall back to stored one
  const apiKey = body.apiKey?.trim() || (await getAgentApiKey(body.communityId));
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: "Chưa có API key. Nhập API key trước khi kiểm tra.",
    });
  }

  try {
    const model = buildModel(body.provider, apiKey, body.model);
    await generateText({
      model,
      prompt: "Hi",
      maxOutputTokens: 1,
    });
    logger.info(
      { communityId: body.communityId, provider: body.provider, model: body.model },
      "[agent] model validation OK",
    );
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Lỗi không xác định";
    logger.warn(
      { communityId: body.communityId, provider: body.provider, model: body.model, error: msg },
      "[agent] model validation failed",
    );

    // Map common provider errors to user-friendly messages
    if (/401|unauthorized|authentication|invalid.*key/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        error: "API key không hợp lệ hoặc đã hết hạn.",
      });
    }
    if (/billing|quota|insufficient|credit|payment/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        error: "Tài khoản chưa kích hoạt billing hoặc đã hết credit.",
      });
    }
    if (/model.*not found|does not exist|not available|invalid model/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        error: `Model "${body.model}" không tồn tại hoặc không khả dụng với provider này.`,
      });
    }
    if (/rate|429|too many/i.test(msg)) {
      return NextResponse.json({
        ok: false,
        error: "Rate limit từ provider. Thử lại sau vài giây.",
      });
    }
    // Generic: truncate long messages
    return NextResponse.json({
      ok: false,
      error: msg.length > 200 ? msg.slice(0, 200) + "…" : msg,
    });
  }
}
