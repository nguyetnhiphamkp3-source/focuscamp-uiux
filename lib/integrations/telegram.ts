/**
 * Telegram bot message delivery via sendMessage API.
 */
import { logger } from "@/lib/logger";

export interface TelegramMessage {
  text: string;
  url?: string;
  parseMode?: "HTML" | "MarkdownV2";
  /** Forum topic thread to post into (Telegram message_thread_id). */
  messageThreadId?: number;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: TelegramMessage
): Promise<boolean> {
  try {
    const params: Record<string, unknown> = {
      chat_id: chatId,
      text: message.text.slice(0, 4096),
      disable_web_page_preview: true,
    };
    if (message.messageThreadId !== undefined)
      params.message_thread_id = message.messageThreadId;
    if (message.parseMode) params.parse_mode = message.parseMode;
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
      }
    );
    if (!res.ok) {
      logger.warn(
        { status: res.status, body: await res.text().catch(() => "") },
        "[telegram] sendMessage non-200"
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, "[telegram] fetch failed");
    return false;
  }
}

/**
 * Send long text — splits into 4096-char chunks (Telegram hard limit).
 */
export async function sendTelegramLongText(
  botToken: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  if (!text.trim()) return true;
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 4096) {
    chunks.push(text.slice(i, i + 4096));
  }
  let allOk = true;
  for (const c of chunks) {
    const ok = await sendTelegramMessage(botToken, chatId, { text: c });
    if (!ok) allOk = false;
  }
  return allOk;
}

/**
 * Configure the webhook URL for the platform bot. Run once after deploy.
 */
export async function setTelegramWebhook(input: {
  botToken: string;
  url: string;
  secretToken?: string;
}): Promise<boolean> {
  try {
    const params: Record<string, unknown> = {
      url: input.url,
      drop_pending_updates: true,
      allowed_updates: ["message"],
    };
    if (input.secretToken) params.secret_token = input.secretToken;
    const res = await fetch(
      `https://api.telegram.org/bot${input.botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(params),
      }
    );
    if (!res.ok) {
      logger.error(
        { status: res.status, body: await res.text().catch(() => "") },
        "[telegram] setWebhook failed"
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "[telegram] setWebhook fetch failed");
    return false;
  }
}
