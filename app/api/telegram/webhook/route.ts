/**
 * Telegram bot webhook — receives all updates from BotFather webhook config.
 *
 * Auth: header `X-Telegram-Bot-Api-Secret-Token` must match TELEGRAM_WEBHOOK_SECRET env.
 *
 * Commands handled:
 *  - /start [code]  → if code, link account; else welcome
 *  - /help          → list commands
 *  - /unlink        → disconnect Telegram from focus.camp
 *  - any text       → forward to AI agent for the user's default community
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  sendTelegramMessage,
  sendTelegramLongText,
} from "@/lib/integrations/telegram";
import {
  redeemPairCode,
  unlinkTelegram,
  findUserByTelegramId,
} from "@/lib/services/telegram-link";
import {
  appendMessage,
  getOrCreateConversation,
  getSystemPrompt,
  listMessages,
} from "@/lib/services/agent";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const APP_URL = process.env.APP_URL || "https://focus.camp";

interface TgMessage {
  message_id: number;
  from?: { id: number; username?: string; first_name?: string };
  chat: { id: number; type: string };
  text?: string;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

export async function POST(req: Request) {
  if (!BOT_TOKEN) {
    return NextResponse.json({ error: "bot_not_configured" }, { status: 503 });
  }
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
    }
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const msg = update.message;
  if (!msg || !msg.from || !msg.text) {
    return NextResponse.json({ ok: true });
  }
  const tgUserId = String(msg.from.id);
  const chatId = String(msg.chat.id);
  const text = msg.text.trim();

  // Per-Telegram-user rate limit
  const rl = await rateLimit({
    key: `tg-bot:${tgUserId}`,
    limit: 30,
    windowSec: 60,
  });
  if (!rl.ok) {
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "⏳ Quá nhiều tin nhắn. Đợi 1 phút rồi thử lại.",
    });
    return NextResponse.json({ ok: true });
  }

  try {
    await routeMessage({
      tgUserId,
      tgUsername: msg.from.username,
      tgFirstName: msg.from.first_name,
      chatId,
      text,
    });
  } catch (err) {
    logger.error({ err, tgUserId, text }, "[telegram-webhook] handler error");
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "⚠️ Có lỗi xảy ra. Hãy thử lại sau hoặc liên hệ support@focus.camp",
    });
  }

  return NextResponse.json({ ok: true });
}

async function routeMessage(input: {
  tgUserId: string;
  tgUsername?: string;
  tgFirstName?: string;
  chatId: string;
  text: string;
}) {
  const { tgUserId, tgUsername, chatId, text } = input;

  // /start [code]
  if (text.startsWith("/start")) {
    const parts = text.split(/\s+/);
    const code = parts[1];
    if (code) {
      const res = await redeemPairCode({
        code,
        telegramUserId: tgUserId,
        telegramUsername: tgUsername,
      });
      if (res.ok) {
        await sendTelegramMessage(BOT_TOKEN, chatId, {
          text: "✅ Đã liên kết tài khoản focus.camp thành công!\n\nGiờ bạn có thể chat với AI agent ngay đây. Lịch sử chat đồng bộ với bản web.\n\nGõ /help để xem command.",
        });
      } else {
        const reasonMsg =
          res.reason === "code_expired"
            ? "Code hết hạn. Vào focus.camp tạo code mới."
            : res.reason === "code_not_found"
              ? "Code không đúng. Kiểm tra lại."
              : res.reason === "telegram_already_linked_to_another_account"
                ? "Telegram này đã được link với account focus.camp khác. Unlink trước (gõ /unlink) hoặc dùng Telegram khác."
                : "Lỗi: " + res.reason;
        await sendTelegramMessage(BOT_TOKEN, chatId, {
          text: `❌ ${reasonMsg}`,
        });
      }
      return;
    }
    // No code → check if linked
    const user = await findUserByTelegramId(tgUserId);
    if (user) {
      await sendTelegramMessage(BOT_TOKEN, chatId, {
        text: `👋 Chào ${user.name || "bạn"}!\n\nBạn đã link với focus.camp. Cứ gõ tin nhắn bất kỳ, AI agent sẽ trả lời.\n\nGõ /help để xem command.`,
      });
    } else {
      await sendTelegramMessage(BOT_TOKEN, chatId, {
        text: `👋 Chào! Đây là bot AI của focus.camp.\n\nĐể bắt đầu:\n1. Vào ${APP_URL}/settings/integrations\n2. Click "Link Telegram" để nhận code 6 số\n3. Quay lại đây gõ: /start <code>\n\nSau đó bạn có thể chat AI agent ở đây.`,
      });
    }
    return;
  }

  // /help
  if (text === "/help") {
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: `Commands:
/start <code>  — Liên kết account focus.camp
/help          — Hiển thị help
/unlink        — Huỷ liên kết
<bất kỳ text>  — Chat với AI agent`,
    });
    return;
  }

  // Need linked user beyond this point
  const user = await findUserByTelegramId(tgUserId);
  if (!user) {
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: `⚠️ Bạn chưa link với focus.camp.\n\nVào ${APP_URL}/settings/integrations để lấy code, rồi gõ:\n/start <code>`,
    });
    return;
  }

  // /unlink
  if (text === "/unlink") {
    await unlinkTelegram(user.id);
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "✓ Đã huỷ liên kết. Bot sẽ không còn nhớ ngữ cảnh của bạn.",
    });
    return;
  }

  // Default: forward to AI agent — pick community context
  // Prefer user.defaultCommunityId; else first community user is a member of
  let communityId = user.defaultCommunityId;
  if (!communityId) {
    const m = await prisma.membership.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
      select: { communityId: true },
    });
    communityId = m?.communityId ?? null;
  }
  if (!communityId) {
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "⚠️ Bạn chưa tham gia cộng đồng nào trên focus.camp. AI agent cần context cộng đồng để trả lời.\n\nVào " + APP_URL + "/discovery để khám phá.",
    });
    return;
  }

  // AI generation (non-streaming for Telegram simplicity)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "⚠️ AI agent chưa được kích hoạt. Liên hệ admin.",
    });
    return;
  }

  // Show typing indicator
  fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendChatAction?chat_id=${chatId}&action=typing`
  ).catch(() => {});

  const conversation = await getOrCreateConversation({
    userId: user.id,
    communityId,
    channel: "telegram",
  });
  await appendMessage({
    conversationId: conversation.id,
    role: "user",
    content: text,
  });

  const systemPrompt = await getSystemPrompt(communityId);
  const history = await listMessages(conversation.id, 20);

  // Lazy-import AI SDK
  const { generateText } = await import("ai");
  const { anthropic } = await import("@ai-sdk/anthropic");
  const MODEL_ID = process.env.AGENT_MODEL || "claude-haiku-4-5-20251001";

  let reply = "";
  try {
    const result = await generateText({
      model: anthropic(MODEL_ID),
      system: systemPrompt,
      messages: history.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
      temperature: 0.7,
      maxOutputTokens: 1024,
    });
    reply = result.text || "";
  } catch (err) {
    logger.error({ err, userId: user.id }, "[telegram-webhook] AI gen failed");
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "⚠️ AI lỗi tạm thời. Thử lại sau ít phút.",
    });
    return;
  }

  if (reply.trim()) {
    await appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: reply,
    });
    await sendTelegramLongText(BOT_TOKEN, chatId, reply);
  } else {
    await sendTelegramMessage(BOT_TOKEN, chatId, {
      text: "🤔 (Không có phản hồi)",
    });
  }
}
